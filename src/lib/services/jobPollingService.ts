/**
 * Job Polling Service
 *
 * A robust service for polling job status with proper cleanup and error handling.
 * This service ensures that we don't have multiple polling intervals for the same job
 * and that polling is properly cleaned up when no longer needed.
 * Enhanced with adaptive polling, circuit breakers, and proper error handling.
 */

import { debugLog, debugError } from '@/lib/utils/debug'
import client from '@/lib/api/client'
import { conversionStore, updateConversionStatus } from '@/lib/stores/conversion'
import type { JobStatus as ApiJobStatus } from '@/lib/types/api'
import { FILE_UPLOAD } from '@/lib/config/constants'
import { toastService } from '@/lib/services/toastService'
import { withRetry, RETRY_STRATEGIES } from '@/lib/utils/RetryService'
import { handleError } from '@/lib/errors/errorHandlingService'
import { ConversionError } from '@/lib/errors/error-types'
import { MESSAGE_TEMPLATES } from '@/lib/constants/messages'

// Map API job status to upload store job status
export function mapApiStatusToUploadStatus(
	apiStatus: ApiJobStatus
): 'idle' | 'uploading' | 'uploaded' | 'processing' | 'completed' | 'failed' {
	switch (apiStatus) {
		case 'pending':
			return 'uploading'
		case 'queued':
			return 'uploaded'
		case 'processing':
			return 'processing'
		case 'completed':
			return 'completed'
		case 'failed':
			return 'failed'
		case 'uploaded':
			return 'uploaded'
		default:
			return 'idle'
	}
}

// Base polling configuration
const BASE_POLLING_INTERVAL = 1000 // 1 second (base interval)
const MAX_POLLING_INTERVAL = 10000 // 10 seconds (maximum interval)
const MIN_POLLING_INTERVAL = 1000 // 1 second (minimum interval)
const MAX_POLLING_DURATION = 15 * 60 * 1000 // 15 minutes (reduced from 30 minutes)
const MAX_CONSECUTIVE_ERRORS = 5 // Maximum number of consecutive errors before stopping polling

// File size thresholds for adaptive polling (in bytes)
const FILE_SIZE_THRESHOLDS = FILE_UPLOAD.SIZE_CATEGORIES;

/**
 * Calculate polling interval based on file size and current status
 * 
 * @param fileSize File size in bytes
 * @param status Current job status
 * @param elapsedTime Time elapsed since polling started (ms)
 * @returns Polling interval in milliseconds
 */
function calculatePollingInterval(
	fileSize: number = 0, 
	status: string = 'processing',
	elapsedTime: number = 0
): number {
	// Default interval for unknown file size
	if (!fileSize) return BASE_POLLING_INTERVAL;
	
	// Base interval adjusted for file size
	let interval = BASE_POLLING_INTERVAL;
	
	// Adjust based on file size
	if (fileSize > FILE_SIZE_THRESHOLDS.LARGE) {
		interval = 5000; // 5 seconds for very large files
	} else if (fileSize > FILE_SIZE_THRESHOLDS.MEDIUM) {
		interval = 3000; // 3 seconds for medium-large files
	} else if (fileSize > FILE_SIZE_THRESHOLDS.SMALL) {
		interval = 2000; // 2 seconds for medium files
	}
	
	// Further adjust based on status
	if (status === 'queued') {
		interval = Math.min(interval * 1.5, MAX_POLLING_INTERVAL); // Slower polling when queued
	}
	
	// Progressive backoff for long-running jobs
	if (elapsedTime > 5 * 60 * 1000) { // After 5 minutes
		const backoffFactor = Math.min(elapsedTime / (5 * 60 * 1000), 2); // Cap at 2x
		interval = Math.min(interval * backoffFactor, MAX_POLLING_INTERVAL);
	}
	
	return Math.max(Math.min(interval, MAX_POLLING_INTERVAL), MIN_POLLING_INTERVAL);
}

// Active polling jobs
interface PollingJob {
	jobId: string
	intervalId: NodeJS.Timeout
	startTime: number
	lastPollTime: number
	nextPollTime?: number
	consecutiveErrorCount: number
	isCompleting: boolean // Flag to prevent multiple completion handling
	fileSize?: number // Added file size for adaptive polling
	lastStatus?: string // Track last known status
	lastProgress?: number // Track last known progress
	isSuspended: boolean // Flag to indicate if polling is suspended due to errors
	recoveryTimeout?: NodeJS.Timeout // Timeout for recovery after suspension
	callbacks: {
		onCompleted?: (jobId: string) => void
		onFailed?: (errorMessage: string) => void
		onStatusChange?: (status: string) => void
		onProgress?: (progress: number) => void // Added progress callback
	}
}

// Track active polling jobs
const activePollingJobs = new Map<string, PollingJob>()

/**
 * Start polling for a job's status
 *
 * @param jobId The job ID to poll for
 * @param options Options including callbacks and file size
 * @returns A function to stop polling
 */
export function startPolling(
	jobId: string,
	options: {
		onCompleted?: (jobId: string) => void
		onFailed?: (errorMessage: string) => void
		onStatusChange?: (status: string) => void
		onProgress?: (progress: number) => void // Added progress callback
		fileSize?: number // Added file size parameter
	} = {}
): () => void {
	const { onCompleted, onFailed, onStatusChange, onProgress, fileSize } = options;
	const callbacks = { onCompleted, onFailed, onStatusChange, onProgress };
	
	// If already polling this job, update callbacks and return existing stop function
	if (activePollingJobs.has(jobId)) {
		const existingJob = activePollingJobs.get(jobId)!
		existingJob.callbacks = { ...existingJob.callbacks, ...callbacks }
		// Update file size if provided
		if (fileSize) existingJob.fileSize = fileSize;
		debugLog(`Updated callbacks for existing polling job ${jobId}`)
		return () => stopPolling(jobId)
	}

	// Create a new polling job
	const startTime = Date.now()
	const lastPollTime = 0
	let currentInterval = calculatePollingInterval(fileSize);

	debugLog(`Starting polling for job ${jobId} with initial interval ${currentInterval}ms${fileSize ? ` (file size: ${fileSize} bytes)` : ''}`)

	// Set up the job object
	const job: PollingJob = {
		jobId,
		startTime,
		lastPollTime,
		consecutiveErrorCount: 0,
		isCompleting: false,
		fileSize,
		callbacks,
		isSuspended: false,
		intervalId: 0 as unknown as NodeJS.Timeout // Will be set below
	}
	
	// Create the polling function with retry and error handling
	const pollFunction = async () => {
		const now = Date.now()
		const job = activePollingJobs.get(jobId)

		if (!job) return
		if (job.isCompleting) return
		
		const elapsedTime = now - job.startTime
		if (elapsedTime > MAX_POLLING_DURATION) {
			const error = new ConversionError('Conversion timed out', jobId, 'timeout')
			await handleError(error, {
				context: { jobId, elapsedTime },
				showToast: true,
				endpoint: `conversion/status/${jobId}`
			})
			stopPolling(jobId)
			job.callbacks.onFailed?.(MESSAGE_TEMPLATES.conversion.failed)
			return
		}

		try {
			// Update the conversion store with the current status
			const currentConversionState = conversionStore.get();
			if (currentConversionState.jobId === jobId) {
				updateConversionStatus(
					currentConversionState.status,
					{ isPolling: true }
				);
			}
			
			// Use retry service for status check
			const statusResponse = await withRetry(
				async () => client.getConversionStatus(jobId),
				{
					...RETRY_STRATEGIES.POLLING,
					endpoint: `conversion/status/${jobId}`,
					context: {
						jobId,
						fileSize: job.fileSize,
						elapsedTime
					}
				}
			)

			job.consecutiveErrorCount = 0
			job.lastPollTime = now;

			if (statusResponse && statusResponse.success && statusResponse.data) {
				const { status, progress } = statusResponse.data
				
				// Update the conversion store if this is the active job
				if (currentConversionState.jobId === jobId) {
					updateConversionStatus(
						status,
						{ 
							progress: progress || 0,
							isPolling: status !== 'completed' && status !== 'failed'
						}
					);
				}
				
				if (status !== job.lastStatus) {
					job.lastStatus = status
					job.callbacks.onStatusChange?.(status)
				}
				if (progress && progress !== job.lastProgress) {
					job.lastProgress = progress
					job.callbacks.onProgress?.(progress)
				}

				if (status === 'completed') {
					job.isCompleting = true
					stopPolling(jobId)
					job.callbacks.onCompleted?.(jobId)
				} else if (status === 'failed') {
					const error = new ConversionError(
						statusResponse.data.error || MESSAGE_TEMPLATES.conversion.failed,
						jobId,
						status
					)
					await handleError(error, {
						context: { jobId, status },
						showToast: true,
						endpoint: `conversion/status/${jobId}`
					})
					stopPolling(jobId)
					job.callbacks.onFailed?.(error.message)
				} else {
					// Update polling interval based on current status
					currentInterval = calculatePollingInterval(job.fileSize, status, elapsedTime)
					job.nextPollTime = now + currentInterval
				}
			}
		} catch (error) {
			// Use error handling service
			const result = await handleError(error, {
				context: {
					jobId,
					consecutiveErrors: job.consecutiveErrorCount + 1,
					maxErrors: MAX_CONSECUTIVE_ERRORS
				},
				showToast: job.consecutiveErrorCount >= MAX_CONSECUTIVE_ERRORS - 1,
				endpoint: `conversion/status/${jobId}`
			})

			job.consecutiveErrorCount++

			if (job.consecutiveErrorCount >= MAX_CONSECUTIVE_ERRORS) {
				stopPolling(jobId)
				job.callbacks.onFailed?.(MESSAGE_TEMPLATES.conversion.failed)
			} else if (!result.recovered) {
				// Increase polling interval on error
				currentInterval = Math.min(currentInterval * 2, MAX_POLLING_INTERVAL)
				job.nextPollTime = now + currentInterval
			}
		}
	}

	// Start polling
	const intervalId = setInterval(pollFunction, currentInterval)
	job.intervalId = intervalId
	activePollingJobs.set(jobId, job)

	// Run first poll immediately
	pollFunction().catch(debugError)

	// Return stop function
	return () => stopPolling(jobId)
}

/**
 * Stop polling for a specific job
 */
export function stopPolling(jobId: string): void {
	const job = activePollingJobs.get(jobId)
	if (job) {
		clearInterval(job.intervalId)
		if (job.recoveryTimeout) {
			clearTimeout(job.recoveryTimeout)
		}
		activePollingJobs.delete(jobId)
		
		// Update the conversion store if this is the active job
		const currentConversionState = conversionStore.get();
		if (currentConversionState.jobId === jobId) {
			updateConversionStatus(
				currentConversionState.status,
				{ isPolling: false }
			);
		}
		
		debugLog(`Stopped polling for job ${jobId}`)
	}
}

/**
 * Stop all active polling jobs
 */
export function stopAllPolling(): void {
	activePollingJobs.forEach((job, jobId) => {
		stopPolling(jobId)
	})
	debugLog('Stopped all polling jobs')
}

/**
 * Get information about active polling jobs
 */
export function getActivePollingJobs(): Array<{
	jobId: string
	duration: number
	fileSize?: number
	lastStatus?: string
	lastPollTime?: number
	consecutiveErrorCount: number
	isSuspended: boolean
}> {
	const now = Date.now()
	return Array.from(activePollingJobs.values()).map(job => ({
		jobId: job.jobId,
		duration: now - job.startTime,
		fileSize: job.fileSize,
		lastStatus: job.lastStatus,
		lastPollTime: job.lastPollTime,
		consecutiveErrorCount: job.consecutiveErrorCount,
		isSuspended: job.isSuspended
	}))
}

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
import { withRetry, RETRY_STRATEGIES } from '@/lib/utils/RetryService'
import { handleError } from '@/lib/errors/ErrorHandlingService'
import { updateJobStatus } from '@/lib/stores/upload'
import type { JobStatus as ApiJobStatus } from '@/lib/types/api'
import { FILE_UPLOAD } from '@/lib/config/constants'
import { toastService } from '@/lib/services/toastService'

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
	
	// Create the polling function
	const pollFunction = async () => {
		const now = Date.now()
		const job = activePollingJobs.get(jobId)

		if (!job) return // Job was stopped
		if (job.isCompleting) return // Skip if already handling completion
		if (job.isSuspended) return // Skip if polling is suspended
		
		// Calculate the next poll time
		const nextPoll = now + currentInterval
		job.nextPollTime = nextPoll

		// Update last poll time
		job.lastPollTime = now;
		
		// Calculate elapsed time
		const elapsedTime = now - startTime;

		// Check if we've been polling too long
		if (elapsedTime > MAX_POLLING_DURATION) {
			debugError(`Polling for job ${jobId} exceeded maximum duration (${MAX_POLLING_DURATION}ms), stopping`)
			stopPolling(jobId)
			if (job.callbacks.onFailed) {
				job.callbacks.onFailed('Conversion timed out. This may be due to the file size being too large for processing.')
			}
			
			// Show a toast to the user
			toastService.error('The conversion is taking longer than expected. Please try again with a smaller file or contact support.', {
				duration: 10000
			})
			
			return
		}

		try {
			// Make the status request using the client which has built-in retry and error handling
			const statusResponse = await client.getConversionStatus(jobId)

			// Reset consecutive error count on success
			job.consecutiveErrorCount = 0
			
			// Check if the response is valid
			if (!statusResponse || !statusResponse.success || !statusResponse.data) {
				throw new Error('Invalid status response from server')
			}

			// Extract the status information from the response
			const status = statusResponse.data.status || 'unknown'
			const progress = statusResponse.data.progress || 0
			
			// Update job's last known status and progress
			job.lastStatus = status;
			job.lastProgress = progress;

			// Update job status in store
			const uploadStatus = mapApiStatusToUploadStatus(status as ApiJobStatus)
			updateJobStatus(jobId, uploadStatus, { uploadProgress: progress })

			// Call status change callback if status has changed
			if (job.callbacks.onStatusChange && status !== job.lastStatus) {
				job.callbacks.onStatusChange(status)
			}
			
			// Call progress callback if available and progress has changed
			if (job.callbacks.onProgress && typeof progress === 'number' && progress !== job.lastProgress) {
				job.callbacks.onProgress(progress)
			}

			// Handle job completion
			if (status === 'completed') {
				// Set completing flag to prevent multiple callbacks
				job.isCompleting = true
				debugLog(`Job ${jobId} is completed`)

				// Stop polling immediately
				stopPolling(jobId)
				
				// Call completion callback with the job ID
				if (job.callbacks.onCompleted) {
					try {
						job.callbacks.onCompleted(jobId)
						debugLog(`Completion callback executed for job ${jobId}`)
					} catch (callbackError) {
						debugError(`Error in completion callback for job ${jobId}:`, callbackError)
					}
				}
			}
			// Handle job failure
			else if (status === 'failed') {
				// Stop polling
				stopPolling(jobId)

				// Call failure callback
				if (job.callbacks.onFailed) {
					// Get error message from response if available
					const errorMessage = statusResponse.data.error_message || 
						statusResponse.data.message || 
						'Conversion failed. Please try again.'
					
					job.callbacks.onFailed(errorMessage)
				}
			}
			
			// Recalculate the interval for next poll based on updated information
			currentInterval = calculatePollingInterval(job.fileSize, status, elapsedTime);
		} catch (error) {
			// Increment error counter
			job.consecutiveErrorCount++;
			
			// Handle the error
			const result = await handleError(error, {
				context: { 
					action: 'jobPolling',
					jobId,
					consecutiveErrors: job.consecutiveErrorCount
				},
				showToast: job.consecutiveErrorCount >= 3, // Only show toasts after multiple failures
				severity: 'warning',
				endpoint: 'conversion/status'
			})
			
			// If we've had too many consecutive errors, suspend polling temporarily
			if (job.consecutiveErrorCount >= MAX_CONSECUTIVE_ERRORS) {
				suspendPolling(jobId);
				return;
			}
			
			// Increase the polling interval on errors to avoid overwhelming the server
			currentInterval = Math.min(currentInterval * 1.5, MAX_POLLING_INTERVAL);
		}
	}

	// Start the polling interval and save the ID
	job.intervalId = setInterval(pollFunction, currentInterval) as unknown as NodeJS.Timeout
	
	// Save the job
	activePollingJobs.set(jobId, job)
	
	// Execute immediately to get initial status
	pollFunction().catch(error => {
		debugError(`Initial poll for job ${jobId} failed:`, error)
	})
	
	// Return a function to stop polling
	return () => stopPolling(jobId)
}

/**
 * Temporarily suspend polling due to errors
 * Will automatically resume after a timeout
 */
function suspendPolling(jobId: string): void {
	const job = activePollingJobs.get(jobId)
	if (!job) return
	
	debugLog(`Suspending polling for job ${jobId} due to consecutive errors`)
	
	// Mark the job as suspended
	job.isSuspended = true
	
	// Set a recovery timeout (30 seconds)
	job.recoveryTimeout = setTimeout(() => {
		if (!activePollingJobs.has(jobId)) return
		
		debugLog(`Resuming polling for job ${jobId} after suspension`)
		
		// Reset error counter and suspension flag
		job.consecutiveErrorCount = 0
		job.isSuspended = false
		
		// Execute immediately to get current status
		pollJobStatus(jobId).catch(error => {
			debugError(`Resume poll for job ${jobId} failed:`, error)
		})
	}, 30000) as unknown as NodeJS.Timeout
}

/**
 * Poll a job's status manually (used for resume after suspension)
 */
async function pollJobStatus(jobId: string): Promise<void> {
	const job = activePollingJobs.get(jobId)
	if (!job || job.isCompleting) return
	
	try {
		// Make the status request using the client which has built-in retry and error handling
		const statusResponse = await client.getConversionStatus(jobId)
		
		// Reset consecutive error count on success
		job.consecutiveErrorCount = 0
		
		// Extract the status information from the response
		const status = statusResponse.data?.status || 'unknown'
		const progress = statusResponse.data?.progress || 0
		
		// Update job's last known status and progress
		job.lastStatus = status;
		job.lastProgress = progress;
		
		// Update job status in store
		const uploadStatus = mapApiStatusToUploadStatus(status as ApiJobStatus)
		updateJobStatus(jobId, uploadStatus, { uploadProgress: progress })
		
		// Call status change callback if status has changed
		if (job.callbacks.onStatusChange) {
			job.callbacks.onStatusChange(status)
		}
		
		// Call progress callback if available
		if (job.callbacks.onProgress && typeof progress === 'number') {
			job.callbacks.onProgress(progress)
		}
		
		// Handle job completion
		if (status === 'completed') {
			// Set completing flag to prevent multiple callbacks
			job.isCompleting = true
			debugLog(`Job ${jobId} is completed (detected during manual poll)`)
			
			// Stop polling immediately
			stopPolling(jobId)
			
			// Call completion callback with the job ID
			if (job.callbacks.onCompleted) {
				job.callbacks.onCompleted(jobId)
			}
		}
		// Handle job failure
		else if (status === 'failed') {
			// Stop polling
			stopPolling(jobId)
			
			// Call failure callback
			if (job.callbacks.onFailed) {
				// Get error message from response if available
				const errorMessage = statusResponse.data?.error_message || 
					statusResponse.data?.message || 
					'Conversion failed. Please try again.'
				
				job.callbacks.onFailed(errorMessage)
			}
		}
	} catch (error) {
		// Just log the error, don't increment counter
		debugError(`Manual poll for job ${jobId} failed:`, error)
	}
}

/**
 * Stop polling for a job
 */
export function stopPolling(jobId: string): void {
	const job = activePollingJobs.get(jobId)
	if (!job) return
	
	// Clear the polling interval
	clearInterval(job.intervalId)
	
	// Clear recovery timeout if set
	if (job.recoveryTimeout) {
		clearTimeout(job.recoveryTimeout)
	}
	
	// Remove the job
	activePollingJobs.delete(jobId)
	
	debugLog(`Stopped polling for job ${jobId}`)
}

/**
 * Stop all active polling jobs
 */
export function stopAllPolling(): void {
	const jobIds = Array.from(activePollingJobs.keys())
	jobIds.forEach(jobId => stopPolling(jobId))
	
	debugLog(`Stopped all polling (${jobIds.length} jobs)`)
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

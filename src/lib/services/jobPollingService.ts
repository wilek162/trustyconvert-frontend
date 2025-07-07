/**
 * Job Polling Service
 *
 * A simplified service for polling job status with proper cleanup and error handling.
 * This service ensures that we don't have multiple polling intervals for the same job
 * and that polling is properly cleaned up when no longer needed.
 * Enhanced to better handle large file conversions with adaptive polling.
 */

import { debugLog, debugError } from '@/lib/utils/debug'
import client from '@/lib/api/client'
import { withRetry, RETRY_STRATEGIES } from '@/lib/utils/retry'
import { updateJobStatus } from '@/lib/stores/upload'
import type { JobStatus as ApiJobStatus } from '@/lib/types/api'
import { FILE_UPLOAD } from '@/lib/config/constants'

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
const MAX_POLLING_DURATION = 30 * 60 * 1000 // 30 minutes (increased from 10 minutes)
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
	consecutiveErrorCount: number
	isCompleting: boolean // Flag to prevent multiple completion handling
	fileSize?: number // Added file size for adaptive polling
	lastStatus?: string // Track last known status
	lastPollTime?: number // Track when we last polled
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
	let consecutiveErrorCount = 0
	let currentInterval = calculatePollingInterval(fileSize);

	debugLog(`Starting polling for job ${jobId} with initial interval ${currentInterval}ms${fileSize ? ` (file size: ${fileSize} bytes)` : ''}`)

	// Create the polling function
	const pollFunction = async () => {
		const now = Date.now()
		const job = activePollingJobs.get(jobId)

		if (!job) return // Job was stopped
		if (job.isCompleting) return // Skip if already handling completion

		// Update last poll time
		job.lastPollTime = now;
		
		// Calculate elapsed time
		const elapsedTime = now - startTime;

		// Check if we've been polling too long
		if (elapsedTime > MAX_POLLING_DURATION) {
			debugError(`Polling for job ${jobId} exceeded maximum duration (${MAX_POLLING_DURATION}ms), stopping`)
			stopPolling(jobId)
			if (job.callbacks.onFailed) {
				job.callbacks.onFailed('Conversion timed out. This may be due to the file size being too large for processing. Please try again with a smaller file or contact support.')
			}
			return
		}

		try {
			// Use withRetry for robust API calls with adaptive timeout based on file size
			const statusResponse = await withRetry(
				async () => client.getConversionStatus(jobId),
				{
					...RETRY_STRATEGIES.POLLING,
					maxRetries: 2, // Limit retries for each poll attempt
					onRetry: (error, attempt) => {
						debugLog(`Retrying job status poll (attempt ${attempt}) for job ${jobId}`)
					}
				}
			)

			// Reset consecutive error count on success
			consecutiveErrorCount = 0
			
			// Check if the response is valid
			if (!statusResponse || !statusResponse.success || !statusResponse.data) {
				throw new Error('Invalid status response from server')
			}

			// Extract the status information from the response
			const status = statusResponse.data.status || 'unknown'
			const progress = statusResponse.data.progress || 0
			
			// Update job's last known status
			job.lastStatus = status;

			// Update job status in store
			const uploadStatus = mapApiStatusToUploadStatus(status as ApiJobStatus)
			updateJobStatus(jobId, uploadStatus, { uploadProgress: progress })

			// Call status change callback
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
				debugLog(`Job ${jobId} is completed`)

				// Stop polling immediately
				clearInterval(job.intervalId)
				
				// Call completion callback with the job ID
				if (job.callbacks.onCompleted) {
					try {
						job.callbacks.onCompleted(jobId)
						debugLog(`Completion callback executed for job ${jobId}`)
					} catch (callbackError) {
						debugError(`Error in completion callback for job ${jobId}:`, callbackError)
					}
				}
				
				// Clean up the job
				activePollingJobs.delete(jobId)
				debugLog(`Job ${jobId} polling cleaned up`)
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
			// For processing jobs, recalculate the polling interval based on file size and status
			else {
				// Calculate new interval based on file size, status and elapsed time
				const newInterval = calculatePollingInterval(job.fileSize, status, elapsedTime);
				
				// If the interval has changed significantly, update the polling interval
				if (Math.abs(newInterval - currentInterval) > 500) {
					debugLog(`Adjusting polling interval for job ${jobId} from ${currentInterval}ms to ${newInterval}ms (status: ${status}, elapsed: ${Math.round(elapsedTime / 1000)}s)`)
					
					// Clear the existing interval
					clearInterval(job.intervalId)
					
					// Create a new interval with the updated timing
					const newIntervalId = setInterval(pollFunction, newInterval)
					
					// Update the job with the new interval ID
					job.intervalId = newIntervalId
					
					// Update the current interval
					currentInterval = newInterval
				}
			}
		} catch (error) {
			// Increment consecutive error count
			consecutiveErrorCount++
			
			debugError(`Error polling job status for ${jobId} (consecutive error #${consecutiveErrorCount}):`, error)

			// If too many consecutive errors, stop polling
			if (consecutiveErrorCount >= MAX_CONSECUTIVE_ERRORS) {
				debugError(`Too many consecutive errors for job ${jobId}, stopping polling`)
				stopPolling(jobId)
				
				// Call failure callback
				const job = activePollingJobs.get(jobId)
				if (job && job.callbacks.onFailed) {
					job.callbacks.onFailed('Connection issues detected. Please try again.')
				}
			}
		}
	}

	// Create the initial interval
	const intervalId = setInterval(pollFunction, currentInterval)

	// Store the polling job
	activePollingJobs.set(jobId, {
		jobId,
		intervalId,
		startTime,
		consecutiveErrorCount,
		isCompleting: false,
		fileSize,
		lastPollTime: Date.now(),
		callbacks
	})

	// Execute first poll immediately
	pollFunction().catch(error => {
		debugError(`Error in initial poll for job ${jobId}:`, error)
	})

	// Return function to stop polling
	return () => stopPolling(jobId)
}

/**
 * Stop polling for a job's status
 * 
 * @param jobId The job ID to stop polling for
 */
export function stopPolling(jobId: string): void {
	const job = activePollingJobs.get(jobId)
	if (job) {
		clearInterval(job.intervalId)
		activePollingJobs.delete(jobId)
		debugLog(`Stopped polling for job ${jobId}`)
	}
}

/**
 * Stop all active polling jobs
 */
export function stopAllPolling(): void {
	activePollingJobs.forEach((job) => {
		clearInterval(job.intervalId)
	})
	activePollingJobs.clear()
	debugLog(`Stopped all polling jobs (${activePollingJobs.size})`)
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
}> {
	const now = Date.now()
	return Array.from(activePollingJobs.values()).map((job) => ({
		jobId: job.jobId,
		duration: now - job.startTime,
		fileSize: job.fileSize,
		lastStatus: job.lastStatus,
		lastPollTime: job.lastPollTime
	}))
}

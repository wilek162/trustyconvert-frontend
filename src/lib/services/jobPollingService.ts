/**
 * Job Polling Service
 *
 * A centralized service for polling job status with proper cleanup and error handling.
 * This service ensures that we don't have multiple polling intervals for the same job
 * and that polling is properly cleaned up when no longer needed.
 */

import { debugLog, debugError } from '@/lib/utils/debug'
import client from '@/lib/api/client'
import { withRetry, RETRY_STRATEGIES } from '@/lib/utils/retry'
import { updateJobStatus, updateJobProgress } from '@/lib/stores/upload'
import type { JobStatus as ApiJobStatus } from '@/lib/types/api'

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

// Polling intervals configuration
const DEFAULT_POLLING_INTERVAL = 2000 // 2 seconds
const MAX_POLLING_INTERVAL = 10000 // 10 seconds
const MAX_POLLING_DURATION = 10 * 60 * 1000 // 10 minutes
const BACKOFF_FACTOR = 1.5 // Increase polling interval by 50% on each error
const MAX_CONSECUTIVE_ERRORS = 5 // Maximum number of consecutive errors before stopping polling
const MAX_TOTAL_ERRORS = 15 // Maximum total errors before stopping polling

// Active polling jobs
interface PollingJob {
	jobId: string
	intervalId: NodeJS.Timeout
	startTime: number
	currentInterval: number
	errorCount: number
	consecutiveErrorCount: number
	totalErrorCount: number
	lastPollTime: number
	isCompleting: boolean // Add flag to prevent multiple completion handling
	callbacks: {
		onProgress?: (progress: number) => void
		onCompleted?: (jobId: string) => void
		onFailed?: (errorMessage: string) => void
		onStatusChange?: (status: string, progress: number) => void
	}
}

// Track active polling jobs
const activePollingJobs = new Map<string, PollingJob>()

/**
 * Start polling for a job's status
 *
 * @param jobId The job ID to poll for
 * @param callbacks Optional callbacks for status updates
 * @param initialInterval Optional initial polling interval (ms)
 * @returns A function to stop polling
 */
export function startPolling(
	jobId: string,
	callbacks: {
		onProgress?: (progress: number) => void
		onCompleted?: (jobId: string) => void
		onFailed?: (errorMessage: string) => void
		onStatusChange?: (status: string, progress: number) => void
	} = {},
	initialInterval = DEFAULT_POLLING_INTERVAL
): () => void {
	// If already polling this job, update callbacks and return existing stop function
	if (activePollingJobs.has(jobId)) {
		const existingJob = activePollingJobs.get(jobId)!
		existingJob.callbacks = { ...existingJob.callbacks, ...callbacks }
		debugLog(`Updated callbacks for existing polling job ${jobId}`)
		return () => stopPolling(jobId)
	}

	// Create a new polling job
	const startTime = Date.now()
	let currentInterval = initialInterval
	let errorCount = 0
	let consecutiveErrorCount = 0
	let totalErrorCount = 0

	debugLog(`Starting polling for job ${jobId} with interval ${currentInterval}ms`)

	// Create the polling function
	const pollFunction = async () => {
		const now = Date.now()
		const job = activePollingJobs.get(jobId)

		if (!job) return // Job was stopped
		if (job.isCompleting) return // Skip if already handling completion

		// Update last poll time
		job.lastPollTime = now

		// Check if we've been polling too long
		if (now - startTime > MAX_POLLING_DURATION) {
			debugError(`Polling for job ${jobId} exceeded maximum duration, stopping`)
			stopPolling(jobId)
			if (job.callbacks.onFailed) {
				job.callbacks.onFailed('Polling timed out after maximum duration')
			}
			return
		}

		try {
			// Use a safe, centralized retry strategy with limits
			let statusResponse = null;
			
			try {
				// Properly typed function with retry
				statusResponse = await withRetry(async () => {
					// Call the API using the client
					try {
						// First try the high-level API client function
						return await client.getConversionStatus(jobId);
					} catch (err) {
						// If that fails, try the low-level API client as fallback
						if (client.apiClient && client.apiClient.getJobStatus) {
							debugLog('Falling back to low-level API client for job status');
							return await client.apiClient.getJobStatus(jobId);
						}
						throw err;
					}
				}, {
					...RETRY_STRATEGIES.POLLING,
					maxRetries: 2, // Limit retries for each poll attempt
					onRetry: (error, attempt) => {
						debugLog(`Retrying job status poll (attempt ${attempt}) for job ${jobId}`);
					},
					onExhausted: (error) => {
						debugError(`All retries exhausted for job status poll: ${error instanceof Error ? error.message : 'Unknown error'}`);
					}
				});
			} catch (apiError) {
				debugError(`API error while polling job status:`, apiError);
				throw apiError;
			}

			// Reset consecutive error count on success
			consecutiveErrorCount = 0
			
			// Check if the response is valid
			if (!statusResponse || !statusResponse.data) {
				throw new Error('Invalid status response from server');
			}

			// Extract the status information from the response
			const status = statusResponse.data.status || 'unknown';
			const progress = statusResponse.data.progress || 0;

			// Update job status in store
			const uploadStatus = mapApiStatusToUploadStatus(status as ApiJobStatus)
			await updateJobStatus(jobId, uploadStatus)
			await updateJobProgress(jobId, progress)

			// Call status change callback
			if (job.callbacks.onStatusChange) {
				job.callbacks.onStatusChange(status, progress)
			}

			// Call progress callback
			if (job.callbacks.onProgress) {
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
				} else {
					debugLog(`No completion callback defined for job ${jobId}`)
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
						'Conversion failed';
					
					job.callbacks.onFailed(errorMessage)
				}
			}
		} catch (error) {
			// Increment error counts
			errorCount++
			consecutiveErrorCount++
			totalErrorCount++
			
			// Update the polling job with error counts
			if (job) {
				job.errorCount = errorCount;
				job.consecutiveErrorCount = consecutiveErrorCount;
				job.totalErrorCount = totalErrorCount;
			}
			
			debugError(`Error polling job status for ${jobId} (error #${errorCount}):`, error)

			// Increase polling interval on error (with a maximum)
			if (consecutiveErrorCount > 2) {
				currentInterval = Math.min(currentInterval * BACKOFF_FACTOR, MAX_POLLING_INTERVAL)
				debugLog(`Increased polling interval to ${currentInterval}ms for job ${jobId}`)

				// Update the interval
				if (job && job.intervalId) {
					clearInterval(job.intervalId)
					job.intervalId = setInterval(pollFunction, currentInterval)
					job.currentInterval = currentInterval
				}
			}

			// Stop polling after too many consecutive errors or total errors
			if (consecutiveErrorCount >= MAX_CONSECUTIVE_ERRORS || totalErrorCount >= MAX_TOTAL_ERRORS) {
				debugError(`Too many errors polling job ${jobId}, stopping. Consecutive: ${consecutiveErrorCount}, Total: ${totalErrorCount}`)
				stopPolling(jobId)
				if (job && job.callbacks.onFailed) {
					job.callbacks.onFailed('Failed to check conversion status after multiple attempts')
				}
			}
		}
	}

	// Start polling
	const intervalId = setInterval(pollFunction, currentInterval)

	// Store the polling job
	activePollingJobs.set(jobId, {
		jobId,
		intervalId,
		startTime,
		currentInterval,
		errorCount,
		consecutiveErrorCount,
		totalErrorCount,
		lastPollTime: Date.now(),
		isCompleting: false,
		callbacks
	})

	// Execute immediately for first status check
	pollFunction()

	// Also perform an immediate check for completed status
	// This helps catch cases where the job completed between polling intervals
	setTimeout(async () => {
		try {
			const job = activePollingJobs.get(jobId)
			if (!job || job.isCompleting) return

			// Use a try/catch to handle possible errors safely
			try {
				// Try to get job status using available methods
				let statusResponse;
				try {
					statusResponse = await client.getConversionStatus(jobId);
				} catch (err) {
					// If that fails, try the low-level API client
					if (client.apiClient && client.apiClient.getJobStatus) {
						debugLog('Falling back to low-level API client for immediate status check');
						statusResponse = await client.apiClient.getJobStatus(jobId);
					} else {
						throw err;
					}
				}
				
				if (statusResponse && 
					statusResponse.data && 
					statusResponse.data.status === 'completed') {
					debugLog(`Immediate check found job ${jobId} already completed`)
					// Trigger the poll function again to handle completion
					pollFunction()
				}
			} catch (error) {
				debugError(`Error in immediate status check for job ${jobId}:`, error)
				// Don't increment error counters here, just log the error
			}
		} catch (error) {
			debugError(`General error in immediate status check for job ${jobId}:`, error)
		}
	}, 100)

	// Return a function to stop polling
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
		debugLog(`Stopping polling for job ${jobId}`)
		clearInterval(job.intervalId)
		activePollingJobs.delete(jobId)
	}
}

/**
 * Stop all active polling jobs
 */
export function stopAllPolling(): void {
	debugLog(`Stopping all polling jobs (${activePollingJobs.size} active)`)
	for (const job of activePollingJobs.values()) {
		clearInterval(job.intervalId)
	}
	activePollingJobs.clear()
}

/**
 * Get information about active polling jobs
 * @returns Array of active polling job information
 */
export function getActivePollingJobs(): Array<{
	jobId: string
	duration: number
	interval: number
	errorCount: number
}> {
	const now = Date.now()
	return Array.from(activePollingJobs.values()).map((job) => ({
		jobId: job.jobId,
		duration: now - job.startTime,
		interval: job.currentInterval,
		errorCount: job.errorCount
	}))
}

export default {
	startPolling,
	stopPolling,
	stopAllPolling,
	getActivePollingJobs,
	mapApiStatusToUploadStatus
}

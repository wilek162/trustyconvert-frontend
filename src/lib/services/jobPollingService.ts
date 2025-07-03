/**
 * Job Polling Service
 *
 * A simplified service for polling job status with proper cleanup and error handling.
 * This service ensures that we don't have multiple polling intervals for the same job
 * and that polling is properly cleaned up when no longer needed.
 */

import { debugLog, debugError } from '@/lib/utils/debug'
import client from '@/lib/api/client'
import { withRetry, RETRY_STRATEGIES } from '@/lib/utils/retry'
import { updateJobStatus } from '@/lib/stores/upload'
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

// Polling configuration
const POLLING_INTERVAL = 1000 // Poll every 1 second
const MAX_POLLING_DURATION = 10 * 60 * 1000 // 10 minutes
const MAX_CONSECUTIVE_ERRORS = 5 // Maximum number of consecutive errors before stopping polling

// Active polling jobs
interface PollingJob {
	jobId: string
	intervalId: NodeJS.Timeout
	startTime: number
	consecutiveErrorCount: number
	isCompleting: boolean // Flag to prevent multiple completion handling
	callbacks: {
		onCompleted?: (jobId: string) => void
		onFailed?: (errorMessage: string) => void
		onStatusChange?: (status: string) => void
	}
}

// Track active polling jobs
const activePollingJobs = new Map<string, PollingJob>()

/**
 * Start polling for a job's status
 *
 * @param jobId The job ID to poll for
 * @param callbacks Optional callbacks for status updates
 * @returns A function to stop polling
 */
export function startPolling(
	jobId: string,
	callbacks: {
		onCompleted?: (jobId: string) => void
		onFailed?: (errorMessage: string) => void
		onStatusChange?: (status: string) => void
	} = {}
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
	let consecutiveErrorCount = 0

	debugLog(`Starting polling for job ${jobId} with interval ${POLLING_INTERVAL}ms`)

	// Create the polling function
	const pollFunction = async () => {
		const now = Date.now()
		const job = activePollingJobs.get(jobId)

		if (!job) return // Job was stopped
		if (job.isCompleting) return // Skip if already handling completion

		// Check if we've been polling too long
		if (now - startTime > MAX_POLLING_DURATION) {
			debugError(`Polling for job ${jobId} exceeded maximum duration, stopping`)
			stopPolling(jobId)
			if (job.callbacks.onFailed) {
				job.callbacks.onFailed('Conversion timed out. Please try again.')
			}
			return
		}

		try {
			// Use withRetry for robust API calls
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

			// Update job status in store
			const uploadStatus = mapApiStatusToUploadStatus(status as ApiJobStatus)
			updateJobStatus(jobId, uploadStatus)

			// Call status change callback
			if (job.callbacks.onStatusChange) {
				job.callbacks.onStatusChange(status)
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

	// Create the interval
	const intervalId = setInterval(pollFunction, POLLING_INTERVAL)

	// Store the polling job
	activePollingJobs.set(jobId, {
		jobId,
		intervalId,
		startTime,
		consecutiveErrorCount,
		isCompleting: false,
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
}> {
	const now = Date.now()
	return Array.from(activePollingJobs.values()).map((job) => ({
		jobId: job.jobId,
		duration: now - job.startTime
	}))
}

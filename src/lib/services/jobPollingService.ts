/**
 * Job Polling Service
 *
 * A centralized service for polling job status with proper cleanup and error handling.
 * This service ensures that we don't have multiple polling intervals for the same job
 * and that polling is properly cleaned up when no longer needed.
 */

import { debugLog, debugError } from '@/lib/utils/debug'
import apiClient from '@/lib/api/client'
import { withRetry, RETRY_STRATEGIES } from '@/lib/utils/retry'
import { updateJobStatus, updateJobProgress, setJobDownloadToken } from '@/lib/stores/upload'
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

// Active polling jobs
interface PollingJob {
	jobId: string
	intervalId: NodeJS.Timeout
	startTime: number
	currentInterval: number
	errorCount: number
	lastPollTime: number
	isCompleting: boolean // Add flag to prevent multiple completion handling
	callbacks: {
		onProgress?: (progress: number) => void
		onCompleted?: (downloadToken: string, downloadUrl: string) => void
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
		onCompleted?: (downloadToken: string, downloadUrl: string) => void
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
			// Get job status with retry
			const statusResponse = await withRetry(() => apiClient.getConversionStatus(jobId), {
				...RETRY_STRATEGIES.POLLING,
				maxRetries: 2,
				onRetry: (error, attempt) => {
					debugLog(`Retrying job status poll (attempt ${attempt}) for job ${jobId}`)
				}
			})

			// Reset error count on success
			errorCount = 0

			if (!statusResponse) {
				throw new Error('Failed to get job status')
			}

			const { status, progress = 0 } = statusResponse

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
				// Set completing flag to prevent multiple token requests
				job.isCompleting = true

				try {
					// Stop polling immediately
					clearInterval(job.intervalId)

					// Get download token
					const downloadTokenResponse = await apiClient.getDownloadToken(jobId)

					if (downloadTokenResponse && downloadTokenResponse.download_token) {
						const { download_token } = downloadTokenResponse
						await setJobDownloadToken(jobId, download_token)

						// Get download URL
						const downloadUrl = apiClient.getDownloadUrl(download_token)

						// Call completion callback
						if (job.callbacks.onCompleted) {
							job.callbacks.onCompleted(download_token, downloadUrl)
						}
					}
				} finally {
					// Always clean up the job
					activePollingJobs.delete(jobId)
				}
			}
			// Handle job failure
			else if (status === 'failed') {
				// Stop polling
				stopPolling(jobId)

				// Call failure callback
				if (job.callbacks.onFailed) {
					job.callbacks.onFailed(statusResponse.error_message || 'Conversion failed')
				}
			}
		} catch (error) {
			errorCount++
			debugError(`Error polling job status for ${jobId} (error #${errorCount}):`, error)

			// Increase polling interval on error (with a maximum)
			if (errorCount > 2) {
				currentInterval = Math.min(currentInterval * BACKOFF_FACTOR, MAX_POLLING_INTERVAL)
				debugLog(`Increased polling interval to ${currentInterval}ms for job ${jobId}`)

				// Update the interval
				if (job.intervalId) {
					clearInterval(job.intervalId)
					job.intervalId = setInterval(pollFunction, currentInterval)
					job.currentInterval = currentInterval
				}
			}

			// Stop polling after too many consecutive errors
			if (errorCount >= 5) {
				debugError(`Too many errors polling job ${jobId}, stopping`)
				stopPolling(jobId)
				if (job.callbacks.onFailed) {
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
		lastPollTime: Date.now(),
		isCompleting: false,
		callbacks
	})

	// Execute immediately for first status check
	pollFunction()

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

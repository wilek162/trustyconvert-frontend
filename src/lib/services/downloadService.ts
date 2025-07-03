/**
 * Download Service
 *
 * Handles file download operations and token management.
 * Implements the approach described in download_guide.md.
 */

import client from '@/lib/api/client'
import { getJob, updateJob } from '@/lib/stores/upload'
import { debugLog, debugError } from '@/lib/utils/debug'
import { withRetry, RETRY_STRATEGIES } from '@/lib/utils/retry'
import type { RetryConfig } from '@/lib/utils/retry'
import sessionManager from '@/lib/services/sessionManager'
import { showError } from '@/lib/utils/messageUtils'

export interface DownloadOptions {
	jobId: string
	autoDownload?: boolean
	onSuccess?: () => void
	onError?: (message: string) => void
	onProgress?: (progress: number) => void
}

export interface DownloadResult {
	success: boolean
	token?: string
	url?: string
	error?: string
	filename?: string
}

/**
 * Get existing download token from job store
 */
export function getExistingToken(jobId: string): string | null {
	const job = getJob(jobId)
	return job?.downloadToken || null
}

/**
 * Get download token for a job
 * This function is responsible for obtaining a valid download token
 */
export async function getDownloadToken(jobId: string): Promise<DownloadResult> {
	try {
		// First ensure we have a valid session
		const sessionValid = await sessionManager.ensureSession()
		if (!sessionValid) {
			throw new Error('Invalid session state')
		}

		// Try to get an existing token first
		let token: string | undefined = getExistingToken(jobId) || undefined
		
		// If no existing token, get a new one
		if (!token) {
			debugLog('Fetching new download token for job:', jobId)
			const response = await withRetry(
				() => client.getDownloadToken(jobId),
				RETRY_STRATEGIES.API_REQUEST
			)

			if (!response.success || !response.data?.download_token) {
				const errorMessage = response.data?.error || 'Failed to get download token'
				return {
					success: false,
					error: errorMessage
				}
			}

			token = response.data.download_token
			// Save token in job store
			updateJob(jobId, { downloadToken: token })
		}

		if (!token) {
			throw new Error('Failed to get valid download token')
		}

		const url = client.getDownloadUrl(token)

		return {
			success: true,
			token,
			url
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Failed to get download token'
		debugError('Download token error:', error)

		return {
			success: false,
			error: errorMessage
		}
	}
}

/**
 * Initiate a file download using the proper approach from download_guide.md
 * This uses the <a> tag approach instead of ReadableStream
 */
export async function initiateDownload(token: string, filename?: string): Promise<boolean> {
	try {
		if (!token) {
			throw new Error('No download token provided')
		}

		// Get the download URL
		const downloadUrl = client.getDownloadUrl(token)
		
		// Create an invisible <a> element and trigger click
		const link = document.createElement('a')
		link.href = downloadUrl
		link.download = filename || '' // Not required, but improves behavior in some browsers
		link.style.display = 'none'
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
		
		return true
	} catch (error) {
		debugError('Download initiation error:', error)
		const errorMessage = error instanceof Error ? error.message : 'Download failed'
		showError(errorMessage)
		return false
	}
}

/**
 * Main download function that combines token retrieval and download initiation
 */
export async function downloadFile(options: DownloadOptions): Promise<DownloadResult> {
	const { jobId, autoDownload = true, onSuccess, onError, onProgress } = options

	try {
		// Get a download token
		const tokenResult = await getDownloadToken(jobId)
		
		if (!tokenResult.success) {
			if (onError) onError(tokenResult.error || 'Failed to get download token')
			return tokenResult
		}

		// If autoDownload is true, start the download
		if (autoDownload && tokenResult.token) {
			const downloadSuccess = await initiateDownload(tokenResult.token)
			
			if (downloadSuccess) {
				if (onSuccess) onSuccess()
			} else {
				if (onError) onError('Failed to initiate download')
				return {
					success: false,
					token: tokenResult.token,
					url: tokenResult.url,
					error: 'Failed to initiate download'
				}
			}
		}

		return tokenResult
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Download failed'
		debugError('Download error:', error)
		if (onError) onError(errorMessage)

		return {
			success: false,
			error: errorMessage
		}
	}
}

/**
 * Check download status from the API
 * This is separate from job polling and only checks if a specific file is ready for download
 */
export async function checkDownloadStatus(jobId: string): Promise<{
	isReady: boolean
	hasError: boolean
	errorMessage?: string
	progress: number
}> {
	try {
		const response = await client.getConversionStatus(jobId)
		
		if (!response.success) {
			return {
				isReady: false,
				hasError: true,
				errorMessage: response.data?.message || 'Failed to check download status',
				progress: 0
			}
		}
		
		const data = response.data
		return {
			isReady: data.status === 'completed',
			hasError: data.status === 'failed',
			errorMessage: data.error_message,
			progress: data.progress || 0
		}
	} catch (error) {
		debugError('Download status check error:', error)
		return {
			isReady: false,
			hasError: true,
			errorMessage: error instanceof Error ? error.message : 'Failed to check download status',
			progress: 0
		}
	}
}

// Export as a service object for consistency
const downloadService = {
	downloadFile,
	getExistingToken,
	getDownloadToken,
	initiateDownload,
	checkDownloadStatus
}

export default downloadService

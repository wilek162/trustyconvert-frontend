/**
 * Download Service
 *
 * Handles file download operations and token management
 */

import client from '@/lib/api/client'
import { getJob, updateJob } from '@/lib/stores/upload'
import { debugLog, debugError } from '@/lib/utils/debug'

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
}

/**
 * Get existing download token from job store
 */
export function getExistingToken(jobId: string): string | null {
	const job = getJob(jobId)
	return job?.downloadToken || null
}

/**
 * Download a file using its job ID
 */
export async function downloadFile(options: DownloadOptions): Promise<DownloadResult> {
	const { jobId, autoDownload = true, onSuccess, onError, onProgress } = options

	try {
		// Check if we already have a token in the job store
		const existingToken = getExistingToken(jobId)

		if (existingToken) {
			debugLog('Using existing download token:', existingToken)
			const url = client.getDownloadUrl(existingToken)

			if (autoDownload) {
				window.location.href = url
				if (onSuccess) onSuccess()
			}

			return {
				success: true,
				token: existingToken,
				url
			}
		}

		// Otherwise fetch a new token
		debugLog('Fetching new download token for job:', jobId)
		const response = await client.getDownloadToken(jobId)

		if (!response.success || !response.data?.download_token) {
			const errorMessage = response.message || 'Failed to get download token'
			if (onError) onError(errorMessage)
			return {
				success: false,
				error: errorMessage
			}
		}

		const token = response.data.download_token
		const url = client.getDownloadUrl(token)

		// Save token in job store
		updateJob(jobId, { downloadToken: token })

		// Start download if requested
		if (autoDownload) {
			window.location.href = url
			if (onSuccess) onSuccess()
		}

		return {
			success: true,
			token,
			url
		}
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

// Export as a service object for consistency
const downloadService = {
	downloadFile,
	getExistingToken
}

export default downloadService

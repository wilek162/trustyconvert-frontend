import { useState, useCallback } from 'react'
import  client  from '@/lib/api/client'
import { debugLog, debugError } from '@/lib/utils/debug'
import { handleError } from '@/lib/utils/errorHandling'
import sessionManager from '@/lib/services/sessionManager'
import type { DownloadProgress } from '@/lib/types/api'
interface UseFileDownloadOptions {
	onComplete?: () => void
	onError?: (error: string) => void
	onProgress?: (progress: DownloadProgress) => void
}

interface DownloadState {
	isDownloading: boolean
	progress: DownloadProgress | null
	error: string | null
}

const initialState: DownloadState = {
	isDownloading: false,
	progress: null,
	error: null
}

/**
 * Hook for efficient file downloads using the token-based approach
 *
 * This hook implements the recommended download flow from the API integration guide:
 * 1. Request a download token from the API
 * 2. Redirect the browser to the download URL with the token
 * 3. Let the server handle streaming directly to the browser
 */
export function useFileDownload({ onComplete, onError, onProgress }: UseFileDownloadOptions = {}) {
	const [state, setState] = useState<DownloadState>(initialState)

	// Download file using the token-based approach
	const download = useCallback(
		async (jobId: string, fileName?: string) => {
			try {
				debugLog('Starting download process for job', { jobId })
				setState((prev) => ({ ...prev, isDownloading: true, error: null }))

				// Step 1: Request a download token
				const response = await client.getDownloadToken(jobId)

				// Extract the token from the response (handling different formats)
				const downloadToken =
					response.download_token ||
					response.downloadToken ||
					response.data?.download_token ||
					response.data?.downloadToken

				if (!downloadToken) {
					debugLog('Download token response:', response)
					throw new Error('Failed to get download token from response')
				}

				debugLog('Successfully extracted download token:', downloadToken)

				// Step 2: Generate the download URL
				const downloadUrl = client.getDownloadUrl(downloadToken)
				debugLog('Generated download URL', { downloadUrl })

				// Step 3: Use the recommended approach - browser redirection
				// This is the approach recommended in frontend_download.md
				// Option 2: programmatic click (keeps SPA state intact)
				const a = document.createElement('a')
				a.href = downloadUrl
				a.download = '' // Let the server set the filename
				document.body.appendChild(a)
				a.click()
				a.remove()

				debugLog('Download initiated via browser redirection', { downloadUrl })
				setState((prev) => ({ ...prev, isDownloading: false }))

				// Notify completion after a short delay to allow the download to start
				setTimeout(() => {
					if (onComplete) onComplete()
				}, 1000)
			} catch (error) {
				debugError('Download failed', error)
				const errorMessage = handleError(error, {
					context: { action: 'downloadFile', jobId }
				})
				setState((prev) => ({
					...prev,
					isDownloading: false,
					error: errorMessage
				}))
				if (onError) onError(errorMessage)
			}
		},
		[onComplete, onError]
	)

	// Cancel is now a no-op since we're using browser's native download
	const cancel = useCallback(() => {
		setState(initialState)
	}, [])

	return {
		...state,
		download,
		cancel
	}
}

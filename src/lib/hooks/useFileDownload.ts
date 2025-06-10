import { useState, useCallback, useRef } from 'react'
import { apiClient, type DownloadProgress } from '@/lib/api/client'
import { debugLog } from '@/lib/utils/debug'

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
 * Hook for efficient file downloads with progress tracking
 */
export function useFileDownload({ onComplete, onError, onProgress }: UseFileDownloadOptions = {}) {
	const [state, setState] = useState<DownloadState>(initialState)
	const abortControllerRef = useRef<AbortController | null>(null)

	// Cleanup function
	const cleanup = useCallback(() => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort()
			abortControllerRef.current = null
		}
		setState(initialState)
	}, [])

	// Download file
	const download = useCallback(
		async (taskId: string, fileName: string) => {
			try {
				debugLog('Starting download', { taskId, fileName })
				setState((prev) => ({ ...prev, isDownloading: true, error: null }))

				// Create new AbortController for this request
				cleanup()
				abortControllerRef.current = new AbortController()

				// Download the file
				const blob = await apiClient.downloadConvertedFile(taskId, {
					onProgress: (progress) => {
						setState((prev) => ({ ...prev, progress }))
						if (onProgress) onProgress(progress)
					},
					signal: abortControllerRef.current.signal
				})

				// Create download link
				const url = window.URL.createObjectURL(blob)
				const link = document.createElement('a')
				link.href = url
				link.download = fileName
				document.body.appendChild(link)
				link.click()
				window.URL.revokeObjectURL(url)
				document.body.removeChild(link)

				debugLog('Download completed', { taskId, fileName })
				setState((prev) => ({ ...prev, isDownloading: false, progress: null }))
				if (onComplete) onComplete()
			} catch (error) {
				debugLog('Download failed', error)
				const errorMessage = error instanceof Error ? error.message : 'Failed to download file'
				setState((prev) => ({
					...prev,
					isDownloading: false,
					progress: null,
					error: errorMessage
				}))
				if (onError) onError(errorMessage)
			}
		},
		[cleanup, onComplete, onError, onProgress]
	)

	// Cancel download
	const cancel = useCallback(() => {
		cleanup()
	}, [cleanup])

	return {
		...state,
		download,
		cancel
	}
}

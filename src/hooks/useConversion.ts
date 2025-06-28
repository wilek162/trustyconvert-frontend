import { useState, useCallback, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { apiClient } from '@/lib/api/client'
import { useToast } from '@/lib/hooks/useToast'
import { useSessionInitializer } from '@/lib/hooks/useSessionInitializer'
import type { JobStatus } from '@/lib/types'
import { withRetry, RETRY_STRATEGIES } from '@/lib/utils/retry'

export interface ConversionResult {
	success: boolean
	jobId?: string
	status?: JobStatus
	downloadToken?: string
	downloadUrl?: string
	error?: string
}

export function useConversion() {
	const [isUploading, setIsUploading] = useState(false)
	const [isConverting, setIsConverting] = useState(false)
	const [isPolling, setIsPolling] = useState(false)
	const [jobId, setJobId] = useState<string | null>(null)
	const { addToast } = useToast()

	// Use session initializer to ensure we have a valid session
	const {
		isInitialized,
		isInitializing,
		error: sessionError,
		resetSession
	} = useSessionInitializer()

	/**
	 * Upload a file and start conversion
	 * @param file File to convert
	 * @param targetFormat Format to convert to
	 * @returns Conversion result
	 */
	const convertFile = useCallback(
		async (file: File, targetFormat: string): Promise<ConversionResult> => {
			try {
				// Ensure we have a valid session
				if (!isInitialized) {
					// If session is initializing, wait for it
					if (isInitializing) {
						throw new Error('Session is initializing. Please try again in a moment.')
					} else {
						// If session failed to initialize, try to reset it
						await resetSession()
						if (!isInitialized) {
							throw new Error('Failed to initialize session. Please refresh the page.')
						}
					}
				}

				// Generate a job ID for this conversion
				const newJobId = uuidv4()
				setJobId(newJobId)

				// Step 1: Upload the file
				setIsUploading(true)
				const uploadResponse = await apiClient.uploadFile(file, newJobId)
				setIsUploading(false)

				if (!uploadResponse || !uploadResponse.job_id) {
					throw new Error('Upload failed: No job ID returned')
				}

				// Step 2: Start conversion
				setIsConverting(true)
				const convertResponse = await apiClient.convertFile(newJobId, targetFormat)

				if (!convertResponse) {
					throw new Error('Conversion failed: No response from server')
				}

				// Step 3: Poll for status until complete or failed
				setIsPolling(true)
				const finalStatus = await pollJobStatus(newJobId)
				setIsPolling(false)
				setIsConverting(false)

				if (finalStatus.status === 'completed') {
					// Step 4: Get download token
					const downloadTokenResponse = await apiClient.getDownloadToken(newJobId)

					if (!downloadTokenResponse || !downloadTokenResponse.download_token) {
						throw new Error('Failed to get download token')
					}

					// Create download URL using the API client utility
					const downloadUrl = apiClient.getDownloadUrl(downloadTokenResponse.download_token)

					return {
						success: true,
						jobId: newJobId,
						status: finalStatus.status,
						downloadToken: downloadTokenResponse.download_token,
						downloadUrl
					}
				} else {
					return {
						success: false,
						jobId: newJobId,
						status: finalStatus.status,
						error: finalStatus.error_message || 'Conversion failed'
					}
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
				addToast({
					title: 'Conversion Error',
					description: errorMessage,
					variant: 'destructive'
				})

				return {
					success: false,
					error: errorMessage
				}
			} finally {
				setIsUploading(false)
				setIsConverting(false)
				setIsPolling(false)
			}
		},
		[isInitialized, isInitializing, resetSession, addToast]
	)

	/**
	 * Poll job status until completed or failed
	 * @param jobId Job ID to poll
	 * @returns Final job status
	 */
	const pollJobStatus = useCallback(async (jobId: string) => {
		// Use the centralized retry utility with polling strategy
		return withRetry(
			async () => {
				const statusResponse = await apiClient.getConversionStatus(jobId)

				if (!statusResponse) {
					throw new Error('Failed to get job status')
				}

				if (['completed', 'failed'].includes(statusResponse.status)) {
					return statusResponse
				}

				// If not complete or failed, throw an error to trigger retry
				throw new Error('Job not complete yet')
			},
			{
				...RETRY_STRATEGIES.POLLING,
				onRetry: (error, attempt) => {
					console.log(
						`Polling job status (attempt ${attempt}/${RETRY_STRATEGIES.POLLING.maxRetries}): ${error.message}`
					)
				}
			}
		)
	}, [])

	/**
	 * Close the current session
	 * Call this when done with conversions
	 */
	const closeSession = useCallback(async () => {
		try {
			await apiClient.closeSession()
		} catch (error) {
			console.error('Failed to close session:', error)
		}
	}, [])

	return {
		convertFile,
		closeSession,
		isUploading,
		isConverting,
		isPolling,
		isProcessing: isUploading || isConverting || isPolling,
		isSessionInitialized: isInitialized,
		isSessionInitializing: isInitializing,
		sessionError,
		jobId
	}
}

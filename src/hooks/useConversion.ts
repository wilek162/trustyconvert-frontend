import { useState, useCallback, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { apiClient } from '@/lib/api/client'
import { useToast } from '@/lib/hooks/useToast'
import { useSessionInitializer } from '@/lib/hooks/useSessionInitializer'
import type { JobStatus } from '@/lib/types'

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

	// Initialize session when hook is first used
	useEffect(() => {
		const initSession = async () => {
			if (!isInitialized && !isInitializing && !sessionError) {
				try {
					await apiClient.initSession()
				} catch (error) {
					console.error('Failed to initialize session:', error)
					addToast({
						title: 'Session Error',
						description: 'Failed to initialize session. Please refresh the page.',
						variant: 'destructive'
					})
				}
			}
		}

		initSession()
	}, [isInitialized, isInitializing, sessionError, addToast])

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
					// Try to initialize session if not already done
					if (!isInitializing) {
						try {
							await apiClient.initSession()
						} catch (error) {
							throw new Error('Failed to initialize session. Please refresh the page.')
						}
					} else {
						throw new Error('Session is initializing. Please try again in a moment.')
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
		[isInitialized, isInitializing, addToast]
	)

	/**
	 * Poll job status until completed or failed
	 * @param jobId Job ID to poll
	 * @returns Final job status
	 */
	const pollJobStatus = useCallback(async (jobId: string) => {
		const maxAttempts = 60 // 5 minutes at 5-second intervals
		const pollInterval = 5000 // 5 seconds

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			try {
				const statusResponse = await apiClient.getConversionStatus(jobId)

				if (!statusResponse) {
					throw new Error('Failed to get job status')
				}

				if (['completed', 'failed'].includes(statusResponse.status)) {
					return statusResponse
				}

				// Wait before polling again
				await new Promise((resolve) => setTimeout(resolve, pollInterval))
			} catch (error) {
				console.error('Error polling job status:', error)
				// Continue polling despite errors
				await new Promise((resolve) => setTimeout(resolve, pollInterval))
			}
		}

		throw new Error('Polling timed out')
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

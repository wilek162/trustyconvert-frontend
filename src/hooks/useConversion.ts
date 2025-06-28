import { useState, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { apiClient } from '@/lib/api/client'
import { useToast } from '@/lib/hooks/useToast'
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

	/**
	 * Upload a file and start conversion
	 * @param file File to convert
	 * @param targetFormat Format to convert to
	 * @returns Conversion result
	 */
	const convertFile = useCallback(
		async (file: File, targetFormat: string): Promise<ConversionResult> => {
			try {
				// For static builds or when API is not available, simulate conversion
				if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
					// Simulate API call with a delay
					await new Promise((resolve) => setTimeout(resolve, 2000))

					// Create a mock download URL using object URL
					const blob = new Blob([await file.arrayBuffer()], { type: file.type })
					const downloadUrl = URL.createObjectURL(blob)

					return {
						success: true,
						jobId: 'mock-job-id',
						status: 'completed',
						downloadUrl
					}
				}

				// Generate a job ID for this conversion
				const newJobId = uuidv4()
				setJobId(newJobId)

				// Step 1: Upload the file
				setIsUploading(true)
				const uploadResponse = await apiClient.uploadFile(file, newJobId)
				setIsUploading(false)

				if (!uploadResponse.job_id) {
					throw new Error('Upload failed: No job ID returned')
				}

				// Step 2: Start conversion
				setIsConverting(true)
				const convertResponse = await apiClient.convertFile(newJobId, targetFormat)
				setIsConverting(false)

				// Step 3: Poll for status until complete or failed
				setIsPolling(true)
				const finalStatus = await pollJobStatus(newJobId)
				setIsPolling(false)

				if (finalStatus.status === 'completed') {
					// Step 4: Get download token
					const downloadTokenResponse = await apiClient.getDownloadToken(newJobId)

					// Create download URL
					const downloadUrl = `${window.location.origin}/api/download?token=${downloadTokenResponse.download_token}`

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
		[addToast]
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
			const statusResponse = await apiClient.getConversionStatus(jobId)

			if (['completed', 'failed'].includes(statusResponse.status)) {
				return statusResponse
			}

			// Wait before polling again
			await new Promise((resolve) => setTimeout(resolve, pollInterval))
		}

		throw new Error('Polling timed out')
	}, [])

	return {
		convertFile,
		isUploading,
		isConverting,
		isPolling,
		isProcessing: isUploading || isConverting || isPolling,
		jobId
	}
}

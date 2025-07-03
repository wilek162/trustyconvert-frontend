import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useMemo, useEffect } from 'react'

import { withRetry, RETRY_STRATEGIES } from '@/lib/utils/retry'
import { useToast } from '@/lib/hooks/useToast'
import { useSupportedFormats } from '@/lib/hooks/useSupportedFormats'
import { useConversionStatus } from '@/lib/hooks/useConversionStatus'
import { debugLog, debugError } from '@/lib/utils/debug'
import { 
	conversionService, 
	conversionStore, 
	isConversionActive, 
	updateConversionStatus, 
	startConversion, 
	completeConversion, 
	setConversionError 
} from '@/lib/stores/conversion'
import { useStore } from './useStore'
import type { ConversionStatus } from '@/lib/types/api'
import apiClient from '@/lib/api/client'
import { MESSAGE_TEMPLATES } from '@/lib/utils/messageUtils'
import { withErrorRetry } from '@/lib/utils/errorRetry'
import { ConversionError, NetworkError, SessionError } from '@/lib/errors/error-types'
import { useConversionStore } from '@/lib/stores/conversion'

const POLLING_INTERVAL = 2000 // 2 seconds

// Statuses that indicate an ongoing conversion on the server side. Keep in sync with the backend documentation.
const IN_PROGRESS_STATUSES = [
	'pending',
	'uploading',
	'queued',
	'processing'
] as const satisfies ReadonlyArray<ConversionStatus>
// A Set for efficient status lookup without TypeScript narrow-union issues
const IN_PROGRESS_STATUS_SET: ReadonlySet<ConversionStatus> = new Set(
	IN_PROGRESS_STATUSES as readonly ConversionStatus[]
)

// Debug logging
const debug = {
	log: (message: string, data?: any) => {
		if (process.env.NODE_ENV === 'development') {
			console.log(`[useFileConversion] ${message}`, data || '')
		}
	},
	error: (message: string, error?: any) => {
		if (process.env.NODE_ENV === 'development') {
			console.error(`[useFileConversion] ${message}`, error || '')
		}
	}
}

export interface FileConversionOptions {
	onSuccess?: (jobId: string) => void
	onError?: (error: Error) => void
	onProgress?: (progress: number) => void
}

/**
 * Hook for managing file conversion flow
 * Handles file upload, format selection, conversion status, and download
 */
export function useFileConversion() {
	const queryClient = useQueryClient()
	const { addToast } = useToast()
	const [file, setFile] = useState<File | null>(null)
	const [format, setFormat] = useState<string>('')
	const [error, setError] = useState<Error | null>(null)
	const [isPosting, setIsPosting] = useState(false)
	const [isConverting, setIsConverting] = useState(false)
	const [progress, setProgress] = useState(0)
	const { success, error: toastError } = useToast()
	const { setConversionJob, updateConversionStatus } = useConversionStore()
	
	// Get conversion state from store
	const conversionState = useStore(conversionStore)
	const isActive = useStore(isConversionActive)
	const jobId = conversionState.jobId

	// Get supported formats
	const { formats, isLoading: isLoadingFormats, error: formatsError } = useSupportedFormats()

	// Use status polling hook
	const {
		status,
		downloadUrl,
		fileName,
		fileSize,
		isLoading: isStatusLoading,
		retryCount,
		error: statusError,
		cancel: cancelConversion
	} = useConversionStatus({
		jobId,
		onError: (err) => setError(new Error(err))
	})

	const conversion = useMutation({
		mutationFn: async ({ file, targetFormat }: { file: File; targetFormat: string }) => {
			debugLog('[conversion.mutationFn] called', {
				file: file?.name,
				targetFormat,
				isPosting,
				jobId,
				status
			})
			// Block duplicate requests only if a conversion is actively in progress
			if (isPosting || isActive) {
				debugLog('[conversion.mutationFn] Early exit: already posting or job in progress', {
					isPosting,
					jobId,
					status
				})
				return
			}
			setIsPosting(true)
			debugLog('[conversion.mutationFn] Starting conversion', {
				file: file.name,
				format: targetFormat
			})

			// Use the conversion service to start the conversion
			return conversionService.startFileConversion(file, targetFormat)
		},
		onSuccess: (data) => {
			debugLog('[conversion.onSuccess] called', data)
			if (!data) {
				debugError('[conversion.onSuccess] No job ID returned from server')
				setError(new Error('No job ID returned from server'))
				setIsPosting(false)
				return
			}
			debugLog('[conversion.onSuccess] Conversion started successfully', { jobId: data })
			setError(null)
			setIsPosting(false)
		},
		onError: (error: Error) => {
			debugError('[conversion.onError] Conversion start failed', error)
			setError(error)
			setIsPosting(false)
			addToast({
				title: 'Error',
				description: error.message,
				variant: 'destructive'
			})
		}
	})

	const startConversion = useCallback(() => {
		debugLog('[startConversion] called', { file, format, isPosting, jobId, status })
		if (!file || !format || isPosting || isActive) {
			const error = new Error('File and format are required or conversion already in progress')
			debugError('[startConversion] Invalid state for conversion', {
				file,
				format,
				isPosting,
				jobId,
				status
			})
			setError(error)
			addToast({
				title: 'Error',
				description: error.message,
				variant: 'destructive'
			})
			return
		}
		debugLog('[startConversion] Triggering conversion.mutate', { file: file.name, format })
		conversion.mutate({ file, targetFormat: format })
	}, [file, format, conversion, addToast, isPosting, jobId, status, isActive])

	const reset = useCallback(() => {
		debug.log('Resetting conversion state')
		setFile(null)
		setFormat('')
		setError(null)
		setIsPosting(false)
		conversionService.resetConversion()
		queryClient.removeQueries({ queryKey: ['conversion-status'] })
	}, [queryClient])

	/**
	 * Convert a file to the specified format
	 */
	const convertFile = useCallback(
		async (file: File, targetFormat: string, options: FileConversionOptions = {}) => {
			if (!file || !targetFormat) {
				toastError('Missing file or target format')
				return null
			}

			setIsConverting(true)
			setProgress(0)

			try {
				// Use the error retry system for the conversion process
				const result = await withErrorRetry(
					async () => {
						// Show initial progress
						setProgress(10)
						updateConversionStatus('uploading', { progress: 10 })

						// Step 1: Upload the file
						const uploadResult = await apiClient.uploadFile(file)
						if (!uploadResult.success) {
							throw new Error('File upload failed')
						}

						// Update progress
						setProgress(40)
						updateConversionStatus('converting', { progress: 40 })
						
						// Get the job ID from the upload response
						const jobId = uploadResult.data.job_id

						// Start tracking this conversion
						startConversion(
							jobId,
							file.name,
							targetFormat,
							file.size
						)

						// Step 2: Start the conversion
						const conversionResult = await apiClient.convertFile(
							jobId,
							targetFormat,
							file.name.split('.').pop()
						)

						if (!conversionResult.success) {
							throw new ConversionError(
								'Conversion failed',
								jobId,
								'failed'
							)
						}

						// Update progress
						setProgress(90)
						updateConversionStatus('completed', { progress: 90 })

						// Get download token if available
						let downloadToken = conversionResult.data.download_token
						if (!downloadToken) {
							try {
								const tokenResult = await apiClient.getDownloadToken(jobId)
								if (tokenResult.success) {
									downloadToken = tokenResult.data.download_token
								}
							} catch (err) {
								debugError('Error getting download token:', err)
								// Continue without token - we'll try again when downloading
							}
						}

						// Get download URL
						const downloadUrl = downloadToken 
							? apiClient.getDownloadUrl(downloadToken)
							: '';

						// Complete the conversion
						completeConversion(downloadUrl, downloadToken)

						// Show success message
						success(MESSAGE_TEMPLATES.conversion.complete)
						
						// Call success callback
						if (options.onSuccess) {
							options.onSuccess(jobId)
						}

						// Complete progress
						setProgress(100)
						
						return jobId
					},
					{
						component: 'useFileConversion',
						action: 'convertFile',
						retryStrategy: 'API_REQUEST',
						showToast: true,
						rethrow: false,
						maxRetries: 2, // Limit retries for user-facing operations
						
						// Additional context for error handling
						fileType: file.type,
						fileSize: file.size,
						targetFormat
					}
				)
				
				return result
			} catch (error) {
				// This should rarely be reached since we set rethrow: false
				debugError('Unhandled error in convertFile:', error)
				
				// Update status to failed
				setConversionError(error instanceof Error ? error.message : 'Unknown error')
				
				// Call error callback if provided
				if (options.onError && error instanceof Error) {
					options.onError(error)
				}
				
				return null
			} finally {
				setIsConverting(false)
			}
		},
		[success, toastError]
	)

	/**
	 * Check the status of a conversion job
	 */
	const checkConversionStatus = useCallback(
		async (jobId: string) => {
			if (!jobId) {
				return null
			}

			try {
				const result = await apiClient.getConversionStatus(jobId)
				if (result.success) {
					return result.data
				}
				return null
			} catch (error) {
				debugError('Error checking conversion status:', error)
				return null
			}
		},
		[]
	)

	/**
	 * Get a download token for a completed conversion
	 */
	const getDownloadToken = useCallback(
		async (jobId: string) => {
			if (!jobId) {
				return null
			}

			try {
				const result = await apiClient.getDownloadToken(jobId)
				if (result.success) {
					return result.data.download_token
				}
				return null
			} catch (error) {
				debugError('Error getting download token:', error)
				return null
			}
		},
		[]
	)

	return {
		file,
		setFile,
		format,
		setFormat,
		startConversion,
		status: conversionState.status,
		progress: conversionState.progress,
		downloadUrl: conversionState.resultUrl,
		fileName: conversionState.filename,
		fileSize: conversionState.fileSize,
		error: error || statusError || conversionState.error,
		isPosting,
		isStatusLoading,
		reset,
		cancelConversion,
		conversion,
		formats,
		isLoadingFormats,
		formatsError,
		retryCount,
		convertFile,
		checkConversionStatus,
		getDownloadToken,
		isConverting,
		progress
	}
}

// ConversionStatus is now imported from @/lib/types/api

/**
 * Hook for managing the entire conversion flow
 * Handles file selection, format selection, and conversion status
 */
export function useConversionFlow() {
	const fileConversion = useFileConversion()
	const [file, setFile] = useState<File | null>(null)
	const [format, setFormat] = useState<string>('')
	const queryClient = useQueryClient()

	// Log when the flow hook is initialized
	useEffect(() => {
		debug.log('useConversionFlow hook initialized')
		return () => {
			debug.log('useConversionFlow hook cleanup')
		}
	}, [])

	const jobId = fileConversion.conversion.data ?? null
	const { status, progress, downloadUrl } = useConversionStatus({
		jobId
	})

	// Memoize the formats data to prevent unnecessary re-renders
	const formatsData = useMemo(() => {
		debug.log('Memoizing formats data', {
			hasData: !!fileConversion.formats,
			dataLength: fileConversion.formats?.length
		})
		return fileConversion.formats || []
	}, [fileConversion.formats])

	const startConversion = useCallback(() => {
		if (!file || !format) return
		debug.log('Starting conversion flow', { file: file.name, format })
		fileConversion.conversion.mutate({ file, targetFormat: format })
	}, [file, format, fileConversion.conversion])

	const reset = useCallback(() => {
		setFile(null)
		setFormat('')
		fileConversion.reset()
	}, [fileConversion])

	return {
		file,
		setFile,
		format,
		setFormat,
		startConversion,
		status,
		progress,
		downloadUrl,
		reset,
		formats: formatsData,
		isLoading: fileConversion.isLoadingFormats
	}
}

export default useFileConversion

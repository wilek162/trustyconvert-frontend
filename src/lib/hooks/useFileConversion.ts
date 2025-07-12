import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useMemo, useEffect } from 'react'

import { RETRY_STRATEGIES } from '@/lib/utils/RetryService'
import { toastService } from '@/lib/services/toastService'
import { useSupportedFormats } from '@/lib/hooks/useSupportedFormats'
import { useConversionStatus } from '@/lib/hooks/useConversionStatus'
import { debugLog, debugError } from '@/lib/utils/debug'
import { 
	conversionService, 
	conversionStore, 
	isConversionActive 
} from '@/lib/stores/conversion'
import { useStore } from './useStore'
import type { ConversionStatus } from '@/lib/types/api'
import type { ToastOptions } from '@/components/providers/ToastListener'

// Statuses that indicate an ongoing conversion on the server side
const IN_PROGRESS_STATUSES = [
	'pending',
	'uploading',
	'queued',
	'processing'
] as const

// A Set for efficient status lookup without TypeScript narrow-union issues
const IN_PROGRESS_STATUS_SET: ReadonlySet<string> = new Set(
	IN_PROGRESS_STATUSES
)

/**
 * Check if we're running in a browser environment
 */
const isBrowser = typeof window !== 'undefined'

/**
 * Hook for managing file conversion flow
 * Handles file upload, format selection, conversion status, and download
 * 
 * This hook is designed to be SSR-compatible and will only perform
 * client-side operations when running in a browser environment.
 */
export function useFileConversion() {
	// Return a minimal implementation during SSR to prevent errors
	if (!isBrowser) {
		return {
			file: null,
			setFile: () => {},
			format: '',
			setFormat: () => {},
			startConversion: () => {},
			status: 'idle' as ConversionStatus,
			progress: 0,
			downloadUrl: null,
			fileName: null,
			fileSize: 0,
			error: null,
			isPosting: false,
			isStatusLoading: false,
			reset: () => {},
			retry: () => {},
			cancelConversion: () => {},
			conversion: { 
				isLoading: false, 
				mutate: () => {},
				data: undefined
			},
			formats: [],
			isLoadingFormats: false,
			formatsError: null,
			retryCount: 0
		}
	}

	// Client-side implementation
	const queryClient = useQueryClient()
	const [file, setFile] = useState<File | null>(null)
	const [format, setFormat] = useState<string>('')
	const [error, setError] = useState<Error | null>(null)
	const [isPosting, setIsPosting] = useState(false)
	
	// Get conversion state from store
	const conversionState = useStore(conversionStore)
	const isActive = useStore(isConversionActive)
	const jobId = conversionState.jobId

	// Get supported formats
	const { formats, isLoading: isLoadingFormats, error: formatsError } = useSupportedFormats()

	// Use status polling hook
	const {
		status,
		progress,
		downloadUrl,
		fileName,
		fileSize: responseFileSize,
		isLoading: isStatusLoading,
		retryCount,
		error: statusError,
		cancel: cancelConversion,
		retry: retryConversion
	} = useConversionStatus({
		jobId,
		fileSize: file?.size,
		showErrorToasts: false
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
			
			const toastOptions: ToastOptions = {
				duration: 10000,
				description: error.message,
				retryAction: () => {
					if (file && format) {
						debugLog('Retrying conversion via error retry action')
						startConversion()
					}
				}
			}
			toastService.error('Failed to start conversion', toastOptions)
		},
		retry: RETRY_STRATEGIES.CRITICAL.maxRetries
	})

	const startConversion = useCallback(() => {
		debugLog('[startConversion] called', { file, format, isPosting, jobId, status })
		if (!file || !format) {
			const error = new Error('File and format are required')
			debugError('[startConversion] Missing file or format', {
				hasFile: !!file,
				hasFormat: !!format
			})
			setError(error)
			toastService.error('Please select both a file and conversion format to continue')
			return
		}
		
		if (isPosting || isActive) {
			debugLog('[startConversion] Conversion already in progress', {
				isPosting,
				isActive,
				jobId,
				status
			})
			
			// If there's an active job but we have an error, offer to retry
			if (error && jobId) {
				const toastOptions: ToastOptions = {
					duration: 8000,
					description: 'Experiencing issues? You can try again.',
					retryAction: () => {
						debugLog('Restarting problematic conversion')
						// Reset state and try again
						conversionService.resetConversion()
						queryClient.invalidateQueries({ queryKey: ['conversion-status'] })
						setIsPosting(false)
						setError(null)
						// Slight delay to ensure state is reset
						setTimeout(() => {
							conversion.mutate({ file, targetFormat: format })
						}, 100)
					}
				}
				toastService.warning('Conversion already started', toastOptions)
				return
			}
			
			toastService.info('Conversion already in progress')
			return
		}
		
		debugLog('[startConversion] Triggering conversion.mutate', { file: file.name, format })
		conversion.mutate({ file, targetFormat: format })
	}, [file, format, conversion, isPosting, jobId, status, isActive, queryClient, error])

	const reset = useCallback(() => {
		debugLog('Resetting conversion state')
		setFile(null)
		setFormat('')
		setError(null)
		setIsPosting(false)
		conversionService.resetConversion()
		queryClient.removeQueries({ queryKey: ['conversion-status'] })
	}, [queryClient])
	
	// Retry the current conversion
	const retry = useCallback(() => {
		if (jobId) {
			// Use the status hook's retry function if we have a jobId
			retryConversion()
		} else if (file && format) {
			// Start from scratch if we have a file and format but no jobId
			conversionService.resetConversion()
			queryClient.invalidateQueries({ queryKey: ['conversion-status'] })
			setIsPosting(false)
			setError(null)
			// Slight delay to ensure state is reset
			setTimeout(() => {
				conversion.mutate({ file, targetFormat: format })
			}, 100)
		}
	}, [jobId, file, format, retryConversion, conversion, queryClient])

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
		fileSize: responseFileSize,
		error: error || statusError || conversionState.error,
		isPosting,
		isStatusLoading,
		reset,
		retry,
		cancelConversion,
		conversion,
		formats,
		isLoadingFormats,
		formatsError,
		retryCount
	}
}

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
		debugLog('useConversionFlow hook initialized')
		return () => {
			debugLog('useConversionFlow hook cleanup')
		}
	}, [])

	const jobId = fileConversion.conversion.data ?? null
	const { status, progress, downloadUrl } = useConversionStatus({
		jobId
	})

	// Memoize the formats data to prevent unnecessary re-renders
	const formatsData = useMemo(() => {
		debugLog('Memoizing formats data', {
			hasData: !!fileConversion.formats,
			dataLength: fileConversion.formats?.length
		})
		return fileConversion.formats || []
	}, [fileConversion.formats])

	const startConversion = useCallback(() => {
		if (!file || !format) return
		debugLog('Starting conversion flow', { file: file.name, format })
		fileConversion.conversion.mutate({ file, targetFormat: format })
	}, [file, format, fileConversion.conversion])

	const reset = useCallback(() => {
		setFile(null)
		setFormat('')
		fileConversion.reset()
	}, [fileConversion])
	
	// Pass through retry for better UX
	const retry = useCallback(() => {
		if (fileConversion.retry) {
			fileConversion.retry()
		}
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
		retry,
		formats: formatsData,
		isLoading: fileConversion.isLoadingFormats,
		error: fileConversion.error
	}
}

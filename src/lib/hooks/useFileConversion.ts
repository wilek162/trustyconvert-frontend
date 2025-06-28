import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useMemo, useEffect } from 'react'

import { apiClient, APIRequestError } from '@/lib/api/client'
import type { TaskStatus } from '@/lib/api/types'
import { withRetry, RETRY_STRATEGIES } from '@/lib/utils/retry'
import { useToast } from '@/lib/hooks/useToast'
import { useSupportedFormats } from '@/lib/hooks/useSupportedFormats'
import { useConversionStatus } from '@/lib/hooks/useConversionStatus'
import { debugLog, debugError } from '@/lib/utils/debug'

const POLLING_INTERVAL = 2000 // 2 seconds

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

/**
 * Hook for managing file conversion flow
 * Handles file upload, format selection, conversion status, and download
 */
export function useFileConversion() {
	const queryClient = useQueryClient()
	const { addToast } = useToast()
	const [file, setFile] = useState<File | null>(null)
	const [format, setFormat] = useState<string>('')
	const [taskId, setTaskId] = useState<string | null>(null)
	const [error, setError] = useState<Error | null>(null)
	const [isPosting, setIsPosting] = useState(false)

	// Get supported formats
	const { formats, isLoading: isLoadingFormats, error: formatsError } = useSupportedFormats()

	// Use status polling hook
	const {
		status,
		progress,
		downloadUrl,
		fileName,
		fileSize,
		isLoading: isStatusLoading,
		retryCount,
		error: statusError,
		cancel: cancelConversion
	} = useConversionStatus({
		taskId,
		onError: (err) => setError(new Error(err))
	})

	const conversion = useMutation({
		mutationFn: async ({ file, targetFormat }: { file: File; targetFormat: string }) => {
			debugLog('[conversion.mutationFn] called', {
				file: file?.name,
				targetFormat,
				isPosting,
				taskId,
				status
			})
			if (isPosting || (taskId && status !== 'idle' && status !== 'failed')) {
				debugLog('[conversion.mutationFn] Early exit: already posting or task in progress', {
					isPosting,
					taskId,
					status
				})
				return
			}
			setIsPosting(true)
			debugLog('[conversion.mutationFn] Starting conversion', {
				file: file.name,
				format: targetFormat
			})
			
			// Use the centralized retry utility with API request strategy
			return withRetry(async () => {
				try {
					const response = await apiClient.startConversion(file, targetFormat)
					debugLog('[conversion.mutationFn] Conversion response', response)
					if (!response?.task_id) {
						throw new Error('No task ID returned from server')
					}
					return response
				} catch (err) {
					debugError('[conversion.mutationFn] Error during conversion', err)
					throw err
				}
			}, {
				...RETRY_STRATEGIES.API_REQUEST,
				onRetry: (error, attempt) => {
					debugLog(`[conversion.mutationFn] Retrying conversion (attempt ${attempt})`, { error: error.message })
				}
			})
		},
		onSuccess: (data) => {
			debugLog('[conversion.onSuccess] called', data)
			if (!data?.task_id) {
				debugError('[conversion.onSuccess] No task ID returned from server', data)
				setError(new Error('No task ID returned from server'))
				setIsPosting(false)
				return
			}
			debugLog('[conversion.onSuccess] Conversion started successfully', { taskId: data.task_id })
			setTaskId(data.task_id)
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
		debugLog('[startConversion] called', { file, format, isPosting, taskId, status })
		if (!file || !format || isPosting || (taskId && status !== 'idle' && status !== 'failed')) {
			const error = new Error('File and format are required or conversion already in progress')
			debugError('[startConversion] Invalid state for conversion', {
				file,
				format,
				isPosting,
				taskId,
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
	}, [file, format, conversion, addToast, isPosting, taskId, status])

	const reset = useCallback(() => {
		debug.log('Resetting conversion state')
		setFile(null)
		setFormat('')
		setTaskId(null)
		setError(null)
		setIsPosting(false)
		queryClient.removeQueries({ queryKey: ['conversion-status'] })
	}, [queryClient])

	return {
		file,
		setFile,
		format,
		setFormat,
		startConversion,
		status,
		progress,
		downloadUrl,
		fileName,
		fileSize,
		error: error || statusError,
		isPosting,
		isStatusLoading,
		reset,
		cancelConversion,
		conversion,
		formats,
		isLoadingFormats,
		formatsError,
		retryCount
	}
}

type ConversionStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed'

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

	const taskId = fileConversion.conversion.data?.task_id ?? null
	const { status, progress, downloadUrl } = useConversionStatus({
		taskId
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
		debug.log('Resetting conversion flow')
		setFile(null)
		setFormat('')
		queryClient.removeQueries({ queryKey: ['conversionStatus'] })
	}, [queryClient])

	// Log when file or format changes
	useEffect(() => {
		debug.log('File or format changed', {
			hasFile: !!file,
			fileType: file?.type,
			format
		})
	}, [file, format])

	return {
		// File state
		file,
		setFile,
		format,
		setFormat,
		// Start conversion
		startConversion,
		// Current task status
		status: status as ConversionStatus,
		progress,
		downloadUrl,
		// Loading states
		isLoading: fileConversion.isPosting || fileConversion.isStatusLoading,
		isError: !!fileConversion.error,
		error: fileConversion.error,
		// Reset function
		reset,
		// Format data
		formats: formatsData,
		isLoadingFormats: fileConversion.isLoadingFormats
	}
}

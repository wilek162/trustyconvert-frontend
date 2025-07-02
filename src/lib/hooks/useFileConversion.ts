import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useMemo, useEffect } from 'react'

import { client } from '@/lib/api/client'
import { withRetry, RETRY_STRATEGIES } from '@/lib/utils/retry'
import { useToast } from '@/lib/hooks/useToast'
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
		retryCount
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

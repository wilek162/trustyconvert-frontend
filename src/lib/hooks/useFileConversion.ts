import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useMemo, useEffect } from 'react'

import { apiClient, APIRequestError } from '@/lib/api/client'
import type { TaskStatus } from '@/lib/api/types'
import { withRetry } from '@/lib/retry'
import { useToast } from '@/lib/hooks/useToast'
import { useSupportedFormats } from '@/lib/hooks/useSupportedFormats'

const POLLING_INTERVAL = 2000 // 2 seconds
const MAX_RETRIES = 3
const RETRY_DELAY = 1000

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
	const [status, setStatus] = useState<TaskStatus['status']>('idle')
	const [progress, setProgress] = useState(0)
	const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
	const [error, setError] = useState<Error | null>(null)

	// Get supported formats
	const { formats, isLoading: isLoadingFormats, error: formatsError } = useSupportedFormats()

	// Log hook initialization
	useEffect(() => {
		debug.log('Hook initialized')
		return () => {
			debug.log('Hook cleanup')
			// Clear any pending timeouts
			if (taskId) {
				debug.log('Cleaning up task', { taskId })
				setTaskId(null)
				setStatus('idle')
			}
		}
	}, [])

	/**
	 * Mutation for starting a file conversion
	 * Handles file upload and conversion initiation
	 */
	const conversion = useMutation({
		mutationFn: async ({ file, targetFormat }: { file: File; targetFormat: string }) => {
			debug.log('Starting conversion', { file: file.name, format: targetFormat })
			const response = await apiClient.startConversion(file, targetFormat)
			return response
		},
		onSuccess: (data) => {
			debug.log('Conversion started successfully', { taskId: data.task_id })
			setTaskId(data.task_id)
			setStatus('processing')
			setError(null)
		},
		onError: (error: Error) => {
			debug.error('Conversion start failed', error)
			setError(error)
			setStatus('failed')
			addToast({
				title: 'Error',
				description: error.message,
				variant: 'destructive'
			})
		}
	})

	/**
	 * Query for checking conversion status
	 * Polls the API until conversion is complete or failed
	 */
	const useConversionStatus = (taskId: string | null) => {
		return useQuery({
			queryKey: ['conversionStatus', taskId],
			queryFn: async () => {
				if (!taskId) throw new Error('No task ID')
				debug.log('Checking conversion status', { taskId })
				const response = await apiClient.getTaskStatus(taskId)
				return response
			},
			enabled: !!taskId && status === 'processing',
			refetchInterval: POLLING_INTERVAL,
			retry: (failureCount, error: any) => {
				// Don't retry on client errors (4xx)
				if (error?.status >= 400 && error?.status < 500) {
					return false
				}
				// Retry up to MAX_RETRIES times with exponential backoff
				return failureCount < MAX_RETRIES
			}
		})
	}

	// Update progress and status based on status query
	useEffect(() => {
		if (conversion.data) {
			const { status: newStatus, progress: newProgress, download_url } = conversion.data
			debug.log('Status updated', { status: newStatus, progress: newProgress })
			setStatus(newStatus)
			setProgress(newProgress)
			if (download_url) {
				setDownloadUrl(download_url)
			}
		}
	}, [conversion.data])

	// Handle status query errors
	useEffect(() => {
		if (conversion.error) {
			debug.error('Status check failed', conversion.error)
			setError(conversion.error as Error)
			setStatus('failed')
		}
	}, [conversion.error])

	/**
	 * Start the conversion process
	 */
	const startConversion = useCallback(() => {
		if (!file || !format) {
			const error = new Error('File and format are required')
			setError(error)
			addToast({
				title: 'Error',
				description: error.message,
				variant: 'destructive'
			})
			return
		}
		setStatus('uploading')
		conversion.mutate({ file, targetFormat: format })
	}, [file, format, conversion, addToast])

	/**
	 * Reset the conversion state
	 */
	const reset = useCallback(() => {
		debug.log('Resetting conversion state')
		setFile(null)
		setFormat('')
		setTaskId(null)
		setStatus('idle')
		setProgress(0)
		setDownloadUrl(null)
		setError(null)
	}, [])

	return {
		file,
		setFile,
		format,
		setFormat,
		startConversion,
		status,
		progress,
		downloadUrl,
		error,
		reset,
		conversion,
		useConversionStatus,
		formats,
		isLoadingFormats,
		formatsError
	}
}

type ConversionStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed'

/**
 * Hook for managing the entire conversion flow
 * Handles file selection, format selection, and conversion status
 */
export function useConversionFlow() {
	const { conversion, useConversionStatus, formats, isLoadingFormats, formatsError } =
		useFileConversion()
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

	const taskId = conversion.data?.task_id ?? null
	const statusQuery = useConversionStatus(taskId)
	const status = statusQuery.data?.status || 'idle'
	const progress = statusQuery.data?.progress || 0
	const downloadUrl = statusQuery.data?.download_url

	// Memoize the formats data to prevent unnecessary re-renders
	const formatsData = useMemo(() => {
		debug.log('Memoizing formats data', {
			hasData: !!formats,
			dataLength: formats?.length
		})
		return formats || []
	}, [formats])

	const startConversion = useCallback(() => {
		if (!file || !format) return
		debug.log('Starting conversion flow', { file: file.name, format })
		conversion.mutate({ file, targetFormat: format })
	}, [file, format, conversion])

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
		// Error state
		error: conversion.error || statusQuery.error || formatsError,
		// Reset function
		reset,
		// Format data
		formats: formatsData,
		isLoadingFormats
	}
}

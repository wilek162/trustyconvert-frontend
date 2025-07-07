/**
 * Conversion Status Hook
 *
 * React hook for tracking conversion job status with automatic polling.
 * Uses the centralized jobPollingService for consistent polling behavior.
 */

import { useState, useEffect, useRef } from 'react'
import type { JobStatusResponse, ConversionStatus } from '@/lib/types/api'
import { debugLog, debugError } from '@/lib/utils/debug'
import { handleError } from '@/lib/utils/errorHandling'
import { startPolling, stopPolling } from '@/lib/services/jobPollingService'

interface UseConversionStatusOptions {
	jobId: string | null
	onError?: (error: string) => void
	pollingInterval?: number
	maxRetries?: number
	fileSize?: number
}

/**
 * Hook for polling and tracking conversion status
 * Uses the centralized jobPollingService for efficient and consistent polling
 *
 * @param options - Configuration options
 * @returns Status information and control functions
 */
export function useConversionStatus({
	jobId,
	onError,
	pollingInterval,
	maxRetries,
	fileSize
}: UseConversionStatusOptions) {
	// State for tracking conversion status
	const [status, setStatus] = useState<ConversionStatus>('idle')
	const [progress, setProgress] = useState<number>(0)
	const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
	const [fileName, setFileName] = useState<string | null>(null)
	const [fileSize_, setFileSize] = useState<number | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState<boolean>(false)
	const [retryCount, setRetryCount] = useState<number>(0)
	
	// Ref to store the stop polling function
	const stopPollingRef = useRef<(() => void) | null>(null)
	
	// Set up polling when jobId changes
	useEffect(() => {
		// Clear previous state when jobId changes
		if (jobId !== null) {
			setIsLoading(true)
			setError(null)
			setRetryCount(0)
		} else {
			setStatus('idle')
			setProgress(0)
			setIsLoading(false)
			return
		}
		
		// Start polling with the jobPollingService
		if (jobId) {
			debugLog('[useConversionStatus] Starting polling', { jobId })
			
			// Start polling with callbacks
			const stopFn = startPolling(jobId, {
				onCompleted: (completedJobId) => {
					debugLog('[useConversionStatus] Job completed', { completedJobId })
					setStatus('completed')
					setProgress(100)
					setIsLoading(false)
				},
				onFailed: (errorMessage) => {
					debugError('[useConversionStatus] Job failed', errorMessage)
					setStatus('failed')
					setError(errorMessage)
					setIsLoading(false)
					if (onError) onError(errorMessage)
				},
				onStatusChange: (newStatus) => {
					debugLog('[useConversionStatus] Status changed', { jobId, status: newStatus })
					setStatus(newStatus as ConversionStatus)
					setIsLoading(newStatus !== 'completed' && newStatus !== 'failed')
				},
				onProgress: (newProgress) => {
					setProgress(newProgress)
				},
				fileSize
			})
			
			// Store the stop function
			stopPollingRef.current = stopFn
			
			// Clean up when unmounting or when jobId changes
			return () => {
				if (stopPollingRef.current) {
					debugLog('[useConversionStatus] Stopping polling', { jobId })
					stopPollingRef.current()
					stopPollingRef.current = null
				}
			}
		}
	}, [jobId, onError, fileSize])
	
	// Cancel method for future implementation
	const cancel = () => {
		if (jobId && stopPollingRef.current) {
			stopPollingRef.current()
			stopPollingRef.current = null
			setStatus('idle')
			setProgress(0)
			setIsLoading(false)
			debugLog('[useConversionStatus] Conversion cancelled', { jobId })
		} else {
			console.warn('Conversion cancellation not implemented or no active job')
		}
	}

	return {
		status,
		progress,
		downloadUrl,
		fileName,
		fileSize: fileSize_,
		isLoading,
		error,
		retryCount,
		cancel
	}
}

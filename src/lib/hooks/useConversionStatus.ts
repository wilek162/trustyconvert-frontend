/**
 * Conversion Status Hook
 *
 * React hook for tracking conversion job status with automatic polling.
 * Uses the centralized jobPollingService for consistent polling behavior.
 * Enhanced with improved error handling and recovery.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { toastService } from '@/lib/services/toastService'
import { handleError } from '@/lib/errors/ErrorHandlingService'
import type { JobStatusResponse, ConversionStatus } from '@/lib/types/api'
import { debugLog, debugError } from '@/lib/utils/debug'
import { startPolling, stopPolling } from '@/lib/services/jobPollingService'

interface UseConversionStatusOptions {
	jobId: string | null
	onError?: (error: string) => void
	onStatusChange?: (status: ConversionStatus) => void
	onComplete?: (jobId: string) => void
	maxRetries?: number
	fileSize?: number
	showErrorToasts?: boolean
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
	onStatusChange,
	onComplete,
	maxRetries = 3,
	fileSize,
	showErrorToasts = true
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
	
	// Handle status change
	const handleStatusChange = useCallback((newStatus: string) => {
		setStatus(newStatus as ConversionStatus)
		setIsLoading(newStatus !== 'completed' && newStatus !== 'failed')
		
		// Call external status change handler if provided
		if (onStatusChange) {
			onStatusChange(newStatus as ConversionStatus)
		}
		
		debugLog('[useConversionStatus] Status changed', { jobId, status: newStatus })
	}, [jobId, onStatusChange])
	
	// Handle progress update
	const handleProgressUpdate = useCallback((newProgress: number) => {
		setProgress(newProgress)
	}, [])
	
	// Handle completed conversion
	const handleCompleted = useCallback((completedJobId: string) => {
		debugLog('[useConversionStatus] Job completed', { completedJobId })
		setStatus('completed')
		setProgress(100)
		setIsLoading(false)
		
		// Call external completion handler if provided
		if (onComplete) {
			onComplete(completedJobId)
		}
		
		// Show success toast only if we don't expect the parent to handle it
		if (!onComplete && showErrorToasts) {
			toastService.success('Conversion completed successfully!', {
				duration: 5000
			})
		}
	}, [onComplete, showErrorToasts])
	
	// Handle failed conversion
	const handleFailed = useCallback((errorMessage: string) => {
		debugError('[useConversionStatus] Job failed', errorMessage)
		setStatus('failed')
		setError(errorMessage)
		setIsLoading(false)
		
		// Notify parent component
		if (onError) {
			onError(errorMessage)
		}
		
		// Show error toast only if we don't expect the parent to handle it
		if (!onError && showErrorToasts) {
			toastService.error(errorMessage, {
				duration: 10000
			})
		}
	}, [onError, showErrorToasts])
	
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
				onCompleted: handleCompleted,
				onFailed: handleFailed,
				onStatusChange: handleStatusChange,
				onProgress: handleProgressUpdate,
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
	}, [jobId, fileSize, handleStatusChange, handleProgressUpdate, handleCompleted, handleFailed])
	
	// Cancel method
	const cancel = useCallback(() => {
		if (jobId && stopPollingRef.current) {
			stopPollingRef.current()
			stopPollingRef.current = null
			setStatus('idle')
			setProgress(0)
			setIsLoading(false)
			debugLog('[useConversionStatus] Conversion cancelled', { jobId })
		}
	}, [jobId])

	// Retry method for user-initiated retries
	const retry = useCallback(() => {
		if (!jobId) return
		
		// Increment retry count
		setRetryCount(prev => prev + 1)
		
		// Stop current polling
		if (stopPollingRef.current) {
			stopPollingRef.current()
			stopPollingRef.current = null
		}
		
		// Reset error state
		setError(null)
		setIsLoading(true)
		
		// Start polling again
		const stopFn = startPolling(jobId, {
			onCompleted: handleCompleted,
			onFailed: handleFailed,
			onStatusChange: handleStatusChange,
			onProgress: handleProgressUpdate,
			fileSize
		})
		
		// Store the new stop function
		stopPollingRef.current = stopFn
		
		debugLog('[useConversionStatus] Retrying conversion', { jobId, retryCount: retryCount + 1 })
	}, [jobId, fileSize, handleCompleted, handleFailed, handleStatusChange, handleProgressUpdate, retryCount])

	return {
		status,
		progress,
		downloadUrl,
		fileName,
		fileSize: fileSize_,
		isLoading,
		error,
		retryCount,
		cancel,
		retry
	}
}

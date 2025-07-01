import { atom } from 'nanostores'
import type { ConversionStatus } from '@/lib/types/conversion'
import { createDerivedStore } from './storeUtils'

/**
 * Conversion state interface
 */
export interface ConversionState {
	jobId: string | null
	status: ConversionStatus
	progress: number
	error?: string
	filename?: string
	targetFormat?: string
	resultUrl?: string
	startTime?: string
	endTime?: string
	fileSize?: number
	isPolling?: boolean
}

// Initial conversion state
const initialConversionState: ConversionState = {
	jobId: null,
	status: 'idle',
	progress: 0,
	isPolling: false
}

// Conversion state store
export const conversionStore = atom<ConversionState>(initialConversionState)

// Derived stores for common queries
export const isConversionActive = createDerivedStore(
	conversionStore,
	(state) => state.status === 'processing' || state.status === 'uploading'
)

export const isConversionComplete = createDerivedStore(
	conversionStore,
	(state) => state.status === 'completed'
)

export const isConversionFailed = createDerivedStore(
	conversionStore,
	(state) => state.status === 'failed'
)

/**
 * Update conversion status with partial data
 * @param status New status
 * @param data Additional data to update
 */
export function updateConversionStatus(status: ConversionStatus, data: Partial<ConversionState>) {
	conversionStore.set({
		...conversionStore.get(),
		status,
		...data
	})
}

/**
 * Update conversion progress
 * @param progress Progress percentage (0-100)
 */
export function updateConversionProgress(progress: number) {
	conversionStore.set({
		...conversionStore.get(),
		progress: Math.max(0, Math.min(100, progress)) // Ensure progress is between 0-100
	})
}

/**
 * Set conversion error
 * @param error Error message
 */
export function setConversionError(error: string) {
	conversionStore.set({
		...conversionStore.get(),
		status: 'failed',
		error,
		isPolling: false,
		endTime: new Date().toISOString()
	})
}

/**
 * Set polling state
 * @param isPolling Whether the status is being polled
 */
export function setPollingStatus(isPolling: boolean) {
	conversionStore.set({
		...conversionStore.get(),
		isPolling
	})
}

/**
 * Start new conversion task
 * @param taskId Task ID
 * @param filename Original filename
 * @param targetFormat Target format
 * @param fileSize File size in bytes
 */
export function startConversion(
	taskId: string,
	filename: string,
	targetFormat: string,
	fileSize?: number
) {
	conversionStore.set({
		...conversionStore.get(),
		jobId: taskId,
		filename,
		targetFormat,
		status: 'processing',
		progress: 0,
		startTime: new Date().toISOString(),
		fileSize,
		error: undefined,
		resultUrl: undefined,
		endTime: undefined,
		isPolling: true
	})
}

/**
 * Complete conversion task
 * @param resultUrl URL to download the converted file
 */
export function completeConversion(resultUrl: string) {
	conversionStore.set({
		...conversionStore.get(),
		status: 'completed',
		progress: 100,
		resultUrl,
		endTime: new Date().toISOString(),
		isPolling: false
	})
}

/**
 * Reset conversion state
 */
export function resetConversion() {
	conversionStore.set(initialConversionState)
}

/**
 * Get current conversion state
 * @returns Current conversion state
 */
export function getConversionState(): ConversionState {
	return conversionStore.get()
}

/**
 * Calculate conversion duration in seconds
 * @returns Duration in seconds or undefined if conversion is not complete
 */
export function getConversionDuration(): number | undefined {
	const state = conversionStore.get()

	if (!state.startTime || !state.endTime) {
		return undefined
	}

	const start = new Date(state.startTime).getTime()
	const end = new Date(state.endTime).getTime()

	return (end - start) / 1000
}

import { atom } from 'nanostores'
import { JobStatus } from '@/lib/types/api'

// Conversion state store
export interface ConversionState {
	taskId: string | null
	status: JobStatus
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
	taskId: null,
	status: 'idle',
	progress: 0,
	isPolling: false
}

// Conversion state store
export const conversionStore = atom<ConversionState>(initialConversionState)

/**
 * Update conversion status with partial data
 * @param status New status
 * @param data Additional data to update
 */
export function updateConversionStatus(status: JobStatus, data: Partial<ConversionState>) {
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
		error
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
		taskId,
		filename,
		targetFormat,
		status: 'processing',
		progress: 0,
		startTime: new Date().toISOString(),
		fileSize,
		error: undefined,
		resultUrl: undefined,
		endTime: undefined
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

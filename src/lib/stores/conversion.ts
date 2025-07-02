/**
 * Conversion Store
 *
 * Manages conversion state with direct API integration.
 * Provides a centralized store for tracking file conversions.
 */

import { map } from 'nanostores'
import type { 
	ConversionStatus, 
	JobStatus, 
	JobStatusResponse,
	ConversionResult
} from '@/lib/types/api'
import { createDerivedStore, batchUpdate } from './storeUtils'
import client from '@/lib/api/client'
import { debugLog, debugError } from '@/lib/utils/debug'

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
	downloadToken?: string
}

// Initial conversion state
const initialConversionState: ConversionState = {
	jobId: null,
	status: 'idle',
	progress: 0,
	isPolling: false
}

// Conversion state store
export const conversionStore = map<ConversionState>(initialConversionState)

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

// Store for tracking multiple conversion jobs
export interface ConversionJob {
	jobId: string
	status: ConversionStatus
	progress: number
	filename?: string
	targetFormat?: string
	fileSize?: number
	startTime?: string
	endTime?: string
	resultUrl?: string
	downloadToken?: string
	error?: string
}

// Store for all conversion jobs
export const conversionJobsStore = map<Record<string, ConversionJob>>({})

// Active job ID
export const activeJobIdStore = map<{ id: string | null }>({ id: null })

/**
 * Update conversion status with partial data
 * @param status New status
 * @param data Additional data to update
 */
export function updateConversionStatus(status: ConversionStatus, data: Partial<ConversionState>) {
	batchUpdate(conversionStore, {
		status,
		...data
	})
}

/**
 * Update conversion progress
 * @param progress Progress percentage (0-100)
 */
export function updateConversionProgress(progress: number) {
	conversionStore.setKey('progress', Math.max(0, Math.min(100, progress)))
}

/**
 * Set conversion error
 * @param error Error message
 */
export function setConversionError(error: string) {
	batchUpdate(conversionStore, {
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
	conversionStore.setKey('isPolling', isPolling)
}

/**
 * Start new conversion job
 * @param jobId Job ID
 * @param filename Original filename
 * @param targetFormat Target format
 * @param fileSize File size in bytes
 */
export function startConversion(
	jobId: string,
	filename: string,
	targetFormat: string,
	fileSize?: number
) {
	batchUpdate(conversionStore, {
		jobId,
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
	
	// Also update the jobs store
	const job: ConversionJob = {
		jobId,
		status: 'processing',
		progress: 0,
		filename,
		targetFormat,
		fileSize,
		startTime: new Date().toISOString()
	}
	
	// Update jobs store
	const currentJobs = conversionJobsStore.get()
	conversionJobsStore.set({
		...currentJobs,
		[jobId]: job
	})
	
	// Set as active job
	activeJobIdStore.setKey('id', jobId)
}

/**
 * Complete conversion job
 * @param resultUrl URL to download the converted file
 * @param downloadToken Optional download token
 */
export function completeConversion(resultUrl: string, downloadToken?: string) {
	const currentState = conversionStore.get()
	batchUpdate(conversionStore, {
		status: 'completed',
		progress: 100,
		resultUrl,
		downloadToken,
		endTime: new Date().toISOString(),
		isPolling: false
	})
	
	// Also update the jobs store if we have a jobId
	if (currentState.jobId) {
		const currentJobs = conversionJobsStore.get()
		const job = currentJobs[currentState.jobId]
		
		if (job) {
			conversionJobsStore.set({
				...currentJobs,
				[currentState.jobId]: {
					...job,
					status: 'completed',
					progress: 100,
					resultUrl,
					downloadToken,
					endTime: new Date().toISOString()
				}
			})
		}
	}
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

/**
 * Start a new file conversion with API integration
 * @param file File to convert
 * @param targetFormat Target format
 * @returns Promise with job ID
 */
export async function startFileConversion(file: File, targetFormat: string): Promise<string> {
	try {
		// Reset any previous conversion state
		resetConversion()
		
		// Start conversion via API
		const response = await client.startConversion(file, targetFormat)
		
		if (!response?.job_id) {
			throw new Error('No job ID returned from server')
		}
		
		// Update store with new conversion
		startConversion(response.job_id, file.name, targetFormat, file.size)
		
		// Return the job ID
		return response.job_id
	} catch (error) {
		debugError('Error starting conversion:', error)
		setConversionError(error instanceof Error ? error.message : 'Unknown error')
		throw error
	}
}

/**
 * Check conversion status from API
 * @param jobId Job ID to check
 * @returns Promise with status response
 */
export async function checkConversionStatus(jobId: string): Promise<JobStatusResponse> {
	try {
		// Get status from API
		const response = await client.getConversionStatus(jobId)
		
		// Update store with status
		updateConversionStatus(response.status as ConversionStatus, {
			progress: response.progress || 0,
			error: response.error_message
		})
		
		// If completed, update with download info
		if (response.status === 'completed' && response.download_token) {
			const downloadUrl = client.getDownloadUrl(response.download_token)
			completeConversion(downloadUrl, response.download_token)
		}
		
		// If failed, update with error
		if (response.status === 'failed') {
			setConversionError(response.error_message || 'Conversion failed')
		}
		
		return response
	} catch (error) {
		debugError('Error checking conversion status:', error)
		setConversionError(error instanceof Error ? error.message : 'Unknown error')
		throw error
	}
}

/**
 * Get download URL for a completed conversion
 * @param jobId Job ID
 * @returns Promise with download URL
 */
export async function getConversionDownloadUrl(jobId: string): Promise<string> {
	try {
		// Check if we already have a download token
		const state = conversionStore.get()
		if (state.downloadToken) {
			return client.getDownloadUrl(state.downloadToken)
		}
		
		// Otherwise get a new token
		const response = await client.getDownloadToken(jobId)
		
		if (!response.download_token) {
			throw new Error('No download token received')
		}
		
		// Update store with token
		const downloadUrl = client.getDownloadUrl(response.download_token)
		completeConversion(downloadUrl, response.download_token)
		
		return downloadUrl
	} catch (error) {
		debugError('Error getting download URL:', error)
		throw error
	}
}

// Export conversion service as an object for consistency
export const conversionService = {
	startFileConversion,
	checkConversionStatus,
	getConversionDownloadUrl,
	resetConversion,
	updateConversionStatus,
	updateConversionProgress,
	setConversionError,
	getConversionState,
	getConversionDuration
}

export default conversionService

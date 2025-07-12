/**
 * High-level API client
 *
 * This module provides a clean interface for components to interact with the API.
 * It coordinates with sessionManager for session state and handles error processing.
 */

import { _apiClient } from './_apiClient'
import sessionManager from '@/lib/services/sessionManager'
import { debugLog, debugError } from '@/lib/utils/debug'
import { handleError } from '@/lib/errors/ErrorHandlingService'
import { retryService, withRetry, RETRY_STRATEGIES } from '@/lib/utils/RetryService'
import type { SessionInitResponse } from '@/lib/types/api'

// Define the extended client type with the _apiClient property
interface ExtendedClient {
	initSession(forceNew?: boolean): Promise<SessionInitResponse | null>
	ensureSession(): Promise<boolean>
	uploadFile(file: File, fileJobId?: string): Promise<StandardResponse>
	convertFile(jobId: string, targetFormat: string, sourceFormat?: string): Promise<StandardResponse>
	startConversion(file: File, targetFormat: string): Promise<StandardResponse>
	getConversionStatus(jobId: string): Promise<StandardResponse>
	getDownloadToken(jobId: string): Promise<StandardResponse>
	getDownloadUrl(token: string): string
	closeSession(): Promise<StandardResponse>
	_apiClient?: typeof _apiClient
}

/**
 * Standard API response type
 */
interface StandardResponse {
	success: boolean
	data: any
}

/**
 * Check if a response contains a CSRF error
 */
function isCsrfError(response: any): boolean {
	return (
		response.data?.csrf_error === true ||
		response.data?.error_message?.includes('CSRF') ||
		response.data?.message?.includes('CSRF') ||
		response.data?.error?.includes('CSRF') ||
		false
	)
}

/**
 * Standardize API responses to a consistent format
 */
function standardizeResponse(data: any): StandardResponse {
	return {
		success: true,
		data
	}
}

/**
 * High-level API client
 */
const client = {
	/**
	 * Initialize a session with the API
	 * This is a wrapper around sessionManager.initSession for API consistency
	 */
	initSession: async (forceNew = false): Promise<SessionInitResponse | null> => {
		return withRetry(async () => {
			const success = await sessionManager.initSession(forceNew)
			if (success) {
				return {} as SessionInitResponse
			}
			return null
		}, {
			...RETRY_STRATEGIES.API_REQUEST,
			endpoint: 'session/init',
			context: { action: 'initSession' }
		})
	},

	/**
	 * Ensure a valid session exists, with minimal API calls
	 * This is a wrapper around sessionManager.ensureSession for API consistency
	 */
	ensureSession: async (): Promise<boolean> => {
		return withRetry(() => sessionManager.ensureSession(), {
			...RETRY_STRATEGIES.API_REQUEST,
			endpoint: 'session/ensure',
			context: { action: 'ensureSession' }
		})
	},

	/**
	 * Upload a file to the server
	 */
	uploadFile: async (file: File, fileJobId?: string): Promise<StandardResponse> => {
		return withRetry(async () => {
			await sessionManager.ensureSession()
			const response = await _apiClient.uploadFile(file, fileJobId)

			if (isCsrfError(response)) {
				await sessionManager.initSession(true)
				const retryResponse = await _apiClient.uploadFile(file, fileJobId)
				return standardizeResponse(retryResponse.data)
			}

			if (response.success === undefined && response.data) {
				debugLog('Upload succeeded with non-standard response format', { response })
				return { success: true, data: response.data }
			}

			if (response.success === false && !('error' in response.data)) {
				debugLog('Upload API returned success:false but no error - treating as success')
				return { success: true, data: response.data }
			}

			return standardizeResponse(response.data)
		}, {
			...RETRY_STRATEGIES.CRITICAL,
			endpoint: 'files/upload',
			context: { action: 'uploadFile', fileSize: file.size }
		})
	},

	/**
	 * Convert a file to a different format
	 */
	convertFile: async (
		jobId: string,
		targetFormat: string,
		sourceFormat?: string
	): Promise<StandardResponse> => {
		return withRetry(async () => {
			await sessionManager.ensureSession()
			const response = await _apiClient.convertFile(jobId, targetFormat, sourceFormat)

			if (isCsrfError(response)) {
				await sessionManager.initSession(true)
				const retryResponse = await _apiClient.convertFile(jobId, targetFormat, sourceFormat)
				return standardizeResponse(retryResponse.data)
			}

			return standardizeResponse(response.data)
		}, {
			...RETRY_STRATEGIES.CRITICAL,
			endpoint: 'conversion/start',
			context: { action: 'convertFile', jobId, targetFormat, sourceFormat }
		})
	},

	/**
	 * Start a conversion directly from a file upload
	 */
	startConversion: async (file: File, targetFormat: string): Promise<StandardResponse> => {
		return withRetry(async () => {
			await sessionManager.ensureSession()
			const response = await _apiClient.startConversion(file, targetFormat)

			if (isCsrfError(response)) {
				await sessionManager.initSession(true)
				const retryResponse = await _apiClient.startConversion(file, targetFormat)
				return standardizeResponse(retryResponse.data)
			}

			return standardizeResponse(response.data)
		}, {
			...RETRY_STRATEGIES.CRITICAL,
			endpoint: 'conversion/direct',
			context: { action: 'startConversion', fileSize: file.size, targetFormat }
		})
	},

	/**
	 * Get a download token for a converted file
	 */
	getDownloadToken: async (jobId: string): Promise<StandardResponse> => {
		return withRetry(async () => {
			await sessionManager.ensureSession()
			const response = await _apiClient.getDownloadToken(jobId)

			if (isCsrfError(response)) {
				await sessionManager.initSession(true)
				const retryResponse = await _apiClient.getDownloadToken(jobId)
				return standardizeResponse(retryResponse.data)
			}

			return standardizeResponse(response.data)
		}, {
			...RETRY_STRATEGIES.API_REQUEST,
			endpoint: 'conversion/download-token',
			context: { action: 'getDownloadToken', jobId }
		})
	},

	/**
	 * Get conversion status for a job
	 */
	getConversionStatus: async (jobId: string): Promise<StandardResponse> => {
		return withRetry(async () => {
			const response = await _apiClient.getJobStatus(jobId)

			if (isCsrfError(response)) {
				await sessionManager.initSession(true)
				const retryResponse = await _apiClient.getJobStatus(jobId)
				return standardizeResponse(retryResponse.data)
			}

			return standardizeResponse(response.data)
		}, {
			...RETRY_STRATEGIES.POLLING,
			endpoint: 'conversion/status',
			context: { action: 'getConversionStatus', jobId },
			showToastOnRetry: false
		})
	},

	/**
	 * Close the current session
	 */
	closeSession: async (): Promise<StandardResponse> => {
		return withRetry(async () => {
			const response = await _apiClient.closeSession()
			return standardizeResponse(response.data)
		}, {
			...RETRY_STRATEGIES.API_REQUEST,
			maxRetries: 1,
			endpoint: 'session/close',
			context: { action: 'closeSession' }
		})
	},

	/**
	 * Get download URL for a token
	 */
	getDownloadUrl: (token: string): string => {
		return _apiClient.getDownloadUrl(token)
	}
}

export default client

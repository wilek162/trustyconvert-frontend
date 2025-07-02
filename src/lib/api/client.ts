/**
 * API Client
 *
 * Provides a type-safe interface for interacting with the backend API.
 */

import { z } from 'zod'
import { _apiClient } from '@/lib/api/_apiClient'

import type { ConversionFormat } from '@/lib/types'
import type {
	ApiClientInterface,
	ApiResponse,
	SessionInitResponse,
	UploadResponse,
	ConvertResponse,
	JobStatusResponse,
	DownloadTokenResponse,
	FormatsResponse,
	DownloadOptions,
	ProgressInfo,
	UploadProgressCallback,
	JobStatus
} from '@/lib/types/api'
import { v4 as uuidv4 } from 'uuid'
import { apiConfig } from './config'
import { handleError, NetworkError, SessionError } from '@/lib/utils/errorHandling'
import { debugLog, debugError } from '@/lib/utils/debug'
import sessionManager from '@/lib/services/sessionManager'
import { withRetry, RETRY_STRATEGIES, isRetryableError } from '@/lib/utils/retry'

/**
 * Custom error class for API request errors
 */
export class APIRequestError extends Error {
	status: number
	code: string

	constructor(message: string, status = 500, code = 'unknown_error') {
		super(message)
		this.name = 'APIRequestError'
		this.status = status
		this.code = code
	}
}

// Response schema for conversion status
const ConversionStatusResponseSchema = z.object({
	job_id: z.string(),
	status: z.string(),
	progress: z.number().optional().default(0),
	error_message: z.string().optional(),
	error_type: z.string().optional(),
	started_at: z.string().optional(),
	created_at: z.string().optional(),
	updated_at: z.string().optional(),
	completed_at: z.string().optional(),
	failed_at: z.string().optional(),
	estimated_time_remaining: z.number().optional(),
	current_step: z.string().optional(),
	original_filename: z.string().optional(),
	converted_path: z.string().nullable().optional(),
	output_size: z.number().nullable().optional(),
	conversion_time: z.number().nullable().optional(),
	download_token: z.string().nullable().optional(),
	filename: z.string().optional(), // Alias for original_filename
	file_size: z.number().optional(), // Alias for output_size
	download_url: z.string().optional() // Constructed URL
})

/**
 * Standardize API response format
 */
function standardizeResponse(data: any) {
	return data
}

/**
 * Check if a response contains a CSRF error
 */
function isCsrfError(response: ApiResponse<any>): boolean {
	return (
		response.data?.csrf_error === true ||
		response.data?.error_message?.includes('CSRF') ||
		response.data?.message?.includes('CSRF') ||
		response.data?.error?.includes('CSRF') ||
		false
	)
}

/**
 * API Client for interacting with the backend
 */
export const client = {
	/**
	 * Initialize a session with the API
	 */
	initSession: async (): Promise<SessionInitResponse | null> => {
		try {
			const response = await _apiClient.initSession()

			// Log the CSRF token from the response for debugging
			if (import.meta.env.DEV) {
				console.group('CSRF Token Synchronization')
				console.log('CSRF token from server response:', response?.csrf_token)
				console.log('CSRF token in store before update:', sessionManager.getCsrfToken())
				console.groupEnd()
			}

			// If we received a response with a CSRF token, update it in the store
			if (response && response.csrf_token) {
				sessionManager.updateCsrfTokenFromServer(response.csrf_token)

				// Log after update to verify
				if (import.meta.env.DEV) {
					console.group('CSRF Token After Update')
					console.log('CSRF token in store after update:', sessionManager.getCsrfToken())
					console.log('Token match status:', sessionManager.getCsrfToken() === response.csrf_token)
					console.groupEnd()
				}
			}

			return response
		} catch (error) {
			throw handleError(error, {
				context: { action: 'initSession' }
			})
		}
	},

	/**
	 * Upload a file to the server
	 */
	uploadFile: async (file: File, jobId?: string) => {
		try {
			// Ensure we have a valid session before uploading
			await sessionManager.ensureSession()

			const fileJobId = jobId || uuidv4()

			// Use retry logic for upload
			const response = await withRetry(() => _apiClient.uploadFile(file, fileJobId), {
				...RETRY_STRATEGIES.API_REQUEST,
				onRetry: (error, attempt) => {
					debugLog(`Retrying file upload (attempt ${attempt})`)
				},
				isRetryable: (error: unknown) => {
					if (typeof error === 'object' && error !== null && 'message' in error) {
						const errorObj = error as { message?: string }
						if (errorObj.message?.includes('validation')) {
							return false
						}
					}
					return isRetryableError(error)
				}
			})

			// Check for CSRF error
			if (isCsrfError(response)) {
				// Try to refresh the CSRF token without creating a new session
				await sessionManager.initSession()
				const retryResponse = await _apiClient.uploadFile(file, fileJobId)
				return standardizeResponse(retryResponse.data)
			}

			return standardizeResponse(response.data)
		} catch (error) {
			throw handleError(error, {
				context: { action: 'uploadFile', fileName: file.name, fileSize: file.size }
			})
		}
	},

	/**
	 * Start the conversion process
	 */
	convertFile: async (jobId: string, targetFormat: string, sourceFormat?: string) => {
		try {
			// Ensure we have a valid session before converting
			await sessionManager.ensureSession()

			// Use retry logic for conversion
			const response = await withRetry(
				() => _apiClient.convertFile(jobId, targetFormat, sourceFormat),
				{
					...RETRY_STRATEGIES.API_REQUEST,
					onRetry: (error, attempt) => {
						debugLog(`Retrying conversion (attempt ${attempt})`)
					}
				}
			)

			// Check for CSRF error
			if (isCsrfError(response)) {
				// Try to refresh the CSRF token without creating a new session
				await sessionManager.initSession()
				const retryResponse = await _apiClient.convertFile(jobId, targetFormat, sourceFormat)
				return standardizeResponse(retryResponse.data)
			}

			return standardizeResponse(response.data)
		} catch (error) {
			throw handleError(error, {
				context: { action: 'convertFile', jobId, targetFormat, sourceFormat }
			})
		}
	},

	/**
	 * Start a new conversion (upload + convert in one step)
	 */
	startConversion: async (file: File, targetFormat: string) => {
		try {
			// Ensure we have a valid session
			await sessionManager.ensureSession()
			
			// Use the API's startConversion method
			const response = await withRetry(
				() => _apiClient.startConversion(file, targetFormat),
				{
					...RETRY_STRATEGIES.API_REQUEST
				}
			)
			
			// Check for CSRF error
			if (isCsrfError(response)) {
				// Try to refresh the CSRF token without creating a new session
				await sessionManager.initSession()
				const retryResponse = await _apiClient.startConversion(file, targetFormat)
				return standardizeResponse(retryResponse.data)
			}
			
			return standardizeResponse(response.data)
		} catch (error) {
			throw handleError(error, {
				context: { action: 'startConversion', fileName: file.name, targetFormat }
			})
		}
	},

	/**
	 * Get the status of a conversion job
	 */
	getConversionStatus: async (jobId: string) => {
		try {
			// Use retry logic for status checks
			const response = await withRetry(() => _apiClient.getJobStatus(jobId), {
				...RETRY_STRATEGIES.POLLING,
				maxRetries: 2
			})

			return standardizeResponse(response.data)
		} catch (error) {
			throw handleError(error, {
				context: { action: 'getConversionStatus', jobId }
			})
		}
	},

	/**
	 * Get a download token for a completed conversion
	 */
	getDownloadToken: async (jobId: string) => {
		try {
			// Ensure we have a valid session before getting download token
			await sessionManager.ensureSession()

			const response = await withRetry(() => _apiClient.getDownloadToken(jobId), {
				...RETRY_STRATEGIES.API_REQUEST
			})

			// Check for CSRF error
			if (isCsrfError(response)) {
				// Try to refresh the CSRF token without creating a new session
				await sessionManager.initSession()
				const retryResponse = await _apiClient.getDownloadToken(jobId)
				return standardizeResponse(retryResponse.data)
			}

			return standardizeResponse(response.data)
		} catch (error) {
			throw handleError(error, {
				context: { action: 'getDownloadToken', jobId }
			})
		}
	},

	/**
	 * Close the current session
	 */
	closeSession: async () => {
		try {
			// Only try to close if we have a token
			if (!sessionManager.hasCsrfToken()) {
				return { success: true }
			}

			const response = await _apiClient.closeSession()

			// Clear session state regardless of response
			await sessionManager.resetSession()

			return standardizeResponse(response.data)
		} catch (error) {
			// Always reset the session even if the API call fails
			await sessionManager.resetSession()

			throw handleError(error, {
				context: { action: 'closeSession' }
			})
		}
	},

	/**
	 * Get supported formats
	 */
	getSupportedFormats: async () => {
		try {
			const response = await _apiClient.getSupportedFormats()
			return standardizeResponse(response.data)
		} catch (error) {
			throw handleError(error, {
				context: { action: 'getSupportedFormats' }
			})
		}
	},

	/**
	 * Get the download URL for a file
	 */
	getDownloadUrl: (token: string): string => {
		return _apiClient.getDownloadUrl(token)
	}
}

export default client

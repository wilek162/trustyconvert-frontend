/**
 * API Client
 *
 * Provides a type-safe interface for interacting with the backend API.
 */

import { z } from 'zod'
import { _apiClient } from '@/lib/api/_apiClient'

import type { ConversionFormat, JobStatus } from '@/lib/types'
import type {
	ApiResponse,
	UploadResponse,
	ConvertResponse,
	ApiErrorInfo,
	SessionInitResponse
} from '@/lib/types/api'
import type { DownloadProgress } from '@/lib/types/conversion'
import { v4 as uuidv4 } from 'uuid'
import { apiConfig } from './config'
import type { DownloadOptions } from './types'
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

/**
 * Schema for conversion status response
 */
export const ConversionStatusResponseSchema = z.object({
	job_id: z.string().optional(),
	task_id: z.string().optional(), // For backward compatibility
	status: z.enum(['idle', 'pending', 'uploaded', 'queued', 'processing', 'completed', 'failed']),
	progress: z.number().min(0).max(100).optional(),
	download_url: z.string().url().optional().nullable(),
	error_message: z.string().optional().nullable(),
	error_type: z.string().optional().nullable(),
	file_size: z.number().optional().nullable(),
	output_size: z.number().optional().nullable(),
	started_at: z.string().optional().nullable(),
	created_at: z.string().optional().nullable(),
	updated_at: z.string().optional().nullable(),
	completed_at: z.string().optional().nullable(),
	failed_at: z.string().optional().nullable(),
	original_filename: z.string().optional().nullable(),
	filename: z.string().optional().nullable(), // Alias for original_filename
	converted_path: z.string().optional().nullable(),
	conversion_time: z.number().optional().nullable(),
	download_token: z.string().optional().nullable(),
	current_step: z.string().optional().nullable(),
	estimated_time_remaining: z.number().optional().nullable()
})

// Export the type for use in other components
export type ConversionStatusResponse = z.infer<typeof ConversionStatusResponseSchema>

/**
 * Standardize response data format
 */
function standardizeResponse(data: any) {
	if (!data) return {}
	return data
}

/**
 * Check if the response indicates a CSRF error
 */
function isCsrfError(response: ApiResponse<any>): boolean {
	return (
		response &&
		!response.success &&
		((response.data as ApiErrorInfo)?.error === 'CSRFValidationError' ||
			(typeof (response.data as ApiErrorInfo)?.message === 'string' &&
				(response.data as ApiErrorInfo)?.message?.includes('CSRF')) ||
			false)
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

			// If we received a response with a CSRF token, update it in the store
			if (response && response.csrf_token) {
				sessionManager.updateCsrfTokenFromServer(response.csrf_token)
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

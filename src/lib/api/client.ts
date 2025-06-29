/**
 * API Client
 *
 * Provides a type-safe interface for interacting with the backend API.
 * This is a wrapper around the lower-level apiClient functions.
 */

import { z } from 'zod'
import {
	initSession as apiInitSession,
	uploadFile,
	convertFile,
	getJobStatus,
	getDownloadToken,
	closeSession,
	getSupportedFormats
} from '@/lib/api/apiClient'
import type { ConversionFormat, JobStatus } from '@/lib/types'
import type { ApiResponse, UploadResponse, ConvertResponse, ApiErrorInfo } from '@/lib/types/api'
import type { DownloadProgress } from '@/lib/types/conversion'
import { v4 as uuidv4 } from 'uuid'
import { apiConfig } from './config'
import type { DownloadOptions } from './types'
import { handleError, NetworkError, SessionError } from '@/lib/utils/errorHandling'
import { getCsrfTokenFromCookie } from '@/lib/utils/csrfUtils'
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
 * This normalizes various API response formats into a consistent structure
 */
function standardizeResponse(data: any) {
	if (!data) return {}

	// Handle various response formats
	const normalized: Record<string, any> = {}

	// Copy all properties
	Object.keys(data).forEach((key) => {
		// Convert snake_case to camelCase
		const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase())
		normalized[camelKey] = data[key]
	})

	return normalized
}

/**
 * Check if the response indicates a CSRF error
 * @param response API response object
 * @returns True if the response indicates a CSRF error
 */
function isCsrfError(response: ApiResponse<any>): boolean {
	return (
		response &&
		!response.success &&
		(response.data?.error === 'CSRFValidationError' ||
			(response.data?.message &&
				typeof response.data.message === 'string' &&
				response.data.message.includes('CSRF')))
	)
}

/**
 * API Client for interacting with the backend
 */
export const apiClient = {
	/**
	 * Initialize a session with the API
	 * @returns Session initialization response
	 */
	initSession: async () => {
		try {
			// Use the centralized session manager to initialize the session
			await sessionManager.debouncedInitSession()

			// Return a standardized empty response since the session manager handles everything
			return {}
		} catch (error) {
			throw handleError(error, {
				context: { action: 'initSession' }
			})
		}
	},

	/**
	 * Upload a file to the server
	 * @param file File to upload
	 * @param jobId Job ID for tracking (optional, will be generated if not provided)
	 * @returns Upload response
	 */
	uploadFile: async (file: File, jobId?: string) => {
		try {
			// First synchronize any existing token from cookie to memory
			sessionManager.synchronizeTokenFromCookie()

			// Ensure we have a valid session before uploading
			if (!sessionManager.hasCsrfToken()) {
				debugLog('No valid CSRF token found before upload, ensuring session')
				await sessionManager.ensureSession()
			}

			const fileJobId = jobId || uuidv4()

			// Use retry logic for upload
			const response = await withRetry(() => uploadFile(file, fileJobId), {
				...RETRY_STRATEGIES.API_REQUEST,
				onRetry: (error, attempt) => {
					debugLog(`Retrying file upload (attempt ${attempt}) for job ${fileJobId}`)
				},
				isRetryable: (error) => {
					// Don't retry if it's a file validation error
					if (error.message?.includes('validation') || error.message?.includes('invalid file')) {
						return false
					}
					return isRetryableError(error)
				}
			})

			// Check for CSRF error
			if (isCsrfError(response)) {
				debugError('CSRF error during upload - refreshing session and retrying')
				// Reset the session and retry once
				await sessionManager.resetSession()
				// Retry the upload with the new CSRF token
				const retryResponse = await uploadFile(file, fileJobId)
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
	 * @param jobId Job ID of the uploaded file
	 * @param targetFormat Target format for conversion
	 * @param sourceFormat Optional source format (usually auto-detected)
	 * @returns Conversion response
	 */
	convertFile: async (jobId: string, targetFormat: string, sourceFormat?: string) => {
		try {
			// First synchronize any existing token from cookie to memory
			sessionManager.synchronizeTokenFromCookie()

			// Ensure we have a valid session before converting
			if (!sessionManager.hasCsrfToken()) {
				debugLog('No valid CSRF token found before conversion, ensuring session')
				await sessionManager.ensureSession()
			}

			// Use retry logic for conversion
			const response = await withRetry(() => convertFile(jobId, targetFormat, sourceFormat), {
				...RETRY_STRATEGIES.API_REQUEST,
				onRetry: (error, attempt) => {
					debugLog(`Retrying conversion (attempt ${attempt}) for job ${jobId}`)
				}
			})

			// Check for CSRF error
			if (isCsrfError(response)) {
				debugError('CSRF error during convert - refreshing session and retrying')
				// Reset the session and retry once
				await sessionManager.resetSession()
				// Retry the conversion with the new CSRF token
				const retryResponse = await convertFile(jobId, targetFormat, sourceFormat)
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
	 * @param jobId Job ID to check status for
	 * @returns Job status response
	 */
	getConversionStatus: async (jobId: string) => {
		try {
			// Use retry logic for status checks
			const response = await withRetry(() => getJobStatus(jobId), {
				...RETRY_STRATEGIES.POLLING,
				maxRetries: 2,
				onRetry: (error, attempt) => {
					debugLog(`Retrying status check (attempt ${attempt}) for job ${jobId}`)
				}
			})

			// Check for CSRF error (unlikely for GET request, but just in case)
			if (isCsrfError(response)) {
				debugError('CSRF error during status check - refreshing session and retrying')
				// Reset the session and retry once
				await sessionManager.resetSession()
				// Retry the status check with the new CSRF token
				const retryResponse = await getJobStatus(jobId)
				return standardizeResponse(retryResponse.data)
			}

			if (!response.success) {
				throw new APIRequestError(
					response.data?.message || 'Failed to get job status',
					response.data?.status || 500,
					response.data?.error || 'status_check_failed'
				)
			}

			// Parse and validate the response
			try {
				const parsedResponse = ConversionStatusResponseSchema.parse(response.data)
				return standardizeResponse(parsedResponse)
			} catch (parseError) {
				debugError('Failed to parse job status response:', parseError)
				// Return the raw response if parsing fails
				return standardizeResponse(response.data)
			}
		} catch (error) {
			throw handleError(error, {
				context: { action: 'getConversionStatus', jobId }
			})
		}
	},

	/**
	 * Get a download token for a completed job
	 * @param jobId Job ID to get download token for
	 * @returns Download token response
	 */
	getDownloadToken: async (jobId: string) => {
		try {
			// Ensure we have a valid session before requesting download token
			if (!sessionManager.hasCsrfToken()) {
				debugLog('No valid CSRF token found before download token request, ensuring session')
				await sessionManager.ensureSession()
			}

			// Use retry logic for download token
			const response = await withRetry(() => getDownloadToken(jobId), {
				...RETRY_STRATEGIES.API_REQUEST,
				onRetry: (error, attempt) => {
					debugLog(`Retrying download token request (attempt ${attempt}) for job ${jobId}`)
				}
			})

			// Check for CSRF error
			if (isCsrfError(response)) {
				debugError('CSRF error during download token request - refreshing session and retrying')
				// Reset the session and retry once
				await sessionManager.resetSession()
				// Retry the download token request with the new CSRF token
				const retryResponse = await getDownloadToken(jobId)
				return standardizeResponse(retryResponse.data)
			}

			if (!response.success) {
				throw new APIRequestError(
					response.data?.message || 'Failed to get download token',
					response.data?.status || 500,
					response.data?.error || 'download_token_failed'
				)
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
	 * @returns Session close response
	 */
	closeSession: async () => {
		try {
			// Ensure we have a valid session before closing
			if (!sessionManager.hasCsrfToken()) {
				debugLog('No valid CSRF token found before closing session, nothing to close')
				return { success: true }
			}

			// Use retry logic for session close
			const response = await withRetry(() => closeSession(), {
				...RETRY_STRATEGIES.API_REQUEST,
				maxRetries: 1, // Only retry once for session close
				onRetry: (error, attempt) => {
					debugLog(`Retrying session close (attempt ${attempt})`)
				}
			})

			// Clear session state regardless of response
			sessionManager.synchronizeTokenFromCookie()

			return standardizeResponse(response.data)
		} catch (error) {
			// Don't throw for session close errors, just log them
			debugError('Error closing session:', error)
			return { success: false, error: 'session_close_failed' }
		}
	},

	/**
	 * Get supported conversion formats
	 * @returns Supported formats response
	 */
	getSupportedFormats: async () => {
		try {
			const response = await getSupportedFormats()
			return standardizeResponse(response.data)
		} catch (error) {
			throw handleError(error, {
				context: { action: 'getSupportedFormats' }
			})
		}
	},

	/**
	 * Get a download URL from a download token
	 * @param token Download token
	 * @returns Download URL
	 */
	getDownloadUrl: (token: string): string => {
		return apiConfig.baseUrl + apiConfig.endpoints.download + '?token=' + encodeURIComponent(token)
	}
}

export default apiClient

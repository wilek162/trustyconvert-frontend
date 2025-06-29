/**
 * API Client
 *
 * Provides a type-safe interface for interacting with the backend API.
 * This is a wrapper around the lower-level apiClient functions.
 */

import { z } from 'zod'
import {
	initSession,
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
import { setCsrfTokenCookie, getCsrfTokenFromCookie } from '@/lib/utils/csrfUtils'
import { debugLog, debugError } from '@/lib/utils/debug'

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

// Add type for error responses
interface ApiErrorResponse {
	success: false
	error?: string
	message?: string
	correlation_id?: string
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
			const response = await initSession()

			// Extract CSRF token from response body and set it in a cookie
			if (response.success && response.data?.csrf_token) {
				debugLog('Received CSRF token from session init')
				setCsrfTokenCookie(response.data.csrf_token)

				// Add a small delay to ensure cookie is properly set
				// This helps avoid race conditions with subsequent requests
				await new Promise((resolve) => setTimeout(resolve, 50))
			} else {
				debugLog('No CSRF token in session init response', response)
			}

			return standardizeResponse(response.data)
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
			// Check for CSRF token before making the request
			const csrfToken = getCsrfTokenFromCookie()
			if (!csrfToken) {
				debugError('No CSRF token available for upload request - initializing session')
				await apiClient.initSession()
			}

			const fileJobId = jobId || uuidv4()
			const response = await uploadFile(file, fileJobId)

			// Check for CSRF error
			if (isCsrfError(response)) {
				debugError('CSRF error during upload - retrying with new session')
				// Initialize a new session and retry once
				await apiClient.initSession()
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
			// Check for CSRF token before making the request
			const csrfToken = getCsrfTokenFromCookie()
			if (!csrfToken) {
				debugError('No CSRF token available for convert request - initializing session')
				await apiClient.initSession()
			}

			const response = await convertFile(jobId, targetFormat, sourceFormat)

			// Check for CSRF error
			if (isCsrfError(response)) {
				debugError('CSRF error during convert - retrying with new session')
				// Initialize a new session and retry once
				await apiClient.initSession()
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
	 * Convenience method to upload and convert in one step
	 * @param file File to upload and convert
	 * @param targetFormat Target format for conversion
	 * @param sourceFormat Optional source format (usually auto-detected)
	 * @returns Job ID and initial status
	 */
	startConversion: async (file: File, targetFormat: string, sourceFormat?: string) => {
		try {
			// Check for CSRF token before making the request
			const csrfToken = getCsrfTokenFromCookie()
			if (!csrfToken) {
				debugError('No CSRF token available for startConversion - initializing session')
				await apiClient.initSession()
			}

			// Generate a job ID
			const jobId = uuidv4()

			// Step 1: Upload the file
			const uploadResp = await uploadFile(file, jobId)

			// Check for CSRF error in upload
			if (isCsrfError(uploadResp)) {
				debugError('CSRF error during upload in startConversion - retrying with new session')
				// Initialize a new session and retry
				await apiClient.initSession()
				// Retry the upload with the new CSRF token
				const retryUploadResp = await uploadFile(file, jobId)
				if (!retryUploadResp.success) {
					throw new APIRequestError(
						retryUploadResp.data?.message || 'Upload failed after retry',
						403,
						retryUploadResp.data?.error || 'upload_failed'
					)
				}
			}

			// Prefer the job_id returned by the backend (some backends may ignore client-supplied UUIDs)
			const serverJobId = (uploadResp.data as any).job_id ?? jobId

			// Step 2: Start conversion (always reference the serverJobId)
			const convertResp = await convertFile(serverJobId, targetFormat, sourceFormat)

			// Check for CSRF error in convert
			if (isCsrfError(convertResp)) {
				debugError('CSRF error during convert in startConversion - retrying with new session')
				// Initialize a new session and retry
				await apiClient.initSession()
				// Retry the conversion with the new CSRF token
				const retryConvertResp = await convertFile(serverJobId, targetFormat, sourceFormat)
				if (!retryConvertResp.success) {
					throw new APIRequestError(
						retryConvertResp.data?.message || 'Conversion failed after retry',
						403,
						retryConvertResp.data?.error || 'conversion_failed'
					)
				}

				const normalized = standardizeResponse({
					job_id: (retryConvertResp.data as any).job_id ?? serverJobId,
					task_id: (retryConvertResp.data as any).task_id ?? serverJobId,
					status: (retryConvertResp.data as any).status
				})

				return normalized
			}

			const normalized = standardizeResponse({
				job_id: (convertResp.data as any).job_id ?? serverJobId,
				task_id: (convertResp.data as any).task_id ?? serverJobId,
				status: (convertResp.data as any).status
			})

			return normalized
		} catch (error) {
			throw handleError(error, {
				context: {
					action: 'startConversion',
					fileName: file.name,
					fileSize: file.size,
					targetFormat,
					sourceFormat
				}
			})
		}
	},

	/**
	 * Get the status of a conversion job
	 * @param jobId Job ID to check
	 * @returns Job status
	 */
	getConversionStatus: async (jobId: string) => {
		try {
			const response = await getJobStatus(jobId)
			return standardizeResponse(response.data)
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
			// Check for CSRF token before making the request
			const csrfToken = getCsrfTokenFromCookie()
			if (!csrfToken) {
				debugError('No CSRF token available for getDownloadToken - initializing session')
				await apiClient.initSession()
			}

			const response = await getDownloadToken(jobId)

			// Check for CSRF error
			if (isCsrfError(response)) {
				debugError('CSRF error during getDownloadToken - retrying with new session')
				// Initialize a new session and retry once
				await apiClient.initSession()
				// Retry with the new CSRF token
				const retryResponse = await getDownloadToken(jobId)
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
	 * Generate a download URL from a token
	 * @param token Download token
	 * @returns Full download URL
	 */
	getDownloadUrl: (token: string): string => {
		return `${apiConfig.baseUrl}${apiConfig.endpoints.download}?token=${token}`
	},

	/**
	 * Close the current session
	 * @returns Session close response
	 */
	closeSession: async () => {
		try {
			// Check for CSRF token before making the request
			const csrfToken = getCsrfTokenFromCookie()
			if (!csrfToken) {
				debugError('No CSRF token available for closeSession - session may already be closed')
				return { message: 'Session already closed' }
			}

			const response = await closeSession()
			return standardizeResponse(response.data)
		} catch (error) {
			throw handleError(error, {
				context: { action: 'closeSession' }
			})
		}
	},

	/**
	 * Get supported conversion formats
	 * @returns Array of supported formats
	 */
	getSupportedFormats: async (): Promise<ConversionFormat[]> => {
		try {
			const response = await getSupportedFormats()
			if (response.success) {
				return response.data.formats
			}
			return []
		} catch (error) {
			handleError(error, {
				context: { action: 'getSupportedFormats' },
				silent: true
			})
			return []
		}
	}
}

export default apiClient

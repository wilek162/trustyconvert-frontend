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
import type { DownloadProgress } from '@/lib/types/conversion'
import { v4 as uuidv4 } from 'uuid'
import { apiConfig } from './config'
import type { DownloadOptions } from './types'
import { handleError, NetworkError } from '@/lib/utils/errorHandling'

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
 * Standardize API response to ensure consistent field access patterns
 * This normalizes field names that might differ between API versions
 */
function standardizeResponse<T extends Record<string, any>>(response: T): T {
	// Create a copy to avoid mutating the original
	const result = { ...response } as Record<string, any>

	// Standardize common field aliases
	if ('task_id' in response && !('job_id' in response)) {
		result.job_id = response.task_id
	}

	if ('original_filename' in response && !('filename' in response)) {
		result.filename = response.original_filename
	}

	if ('output_size' in response && !('file_size' in response)) {
		result.file_size = response.output_size
	}

	// Construct download URL if we have a token but no URL
	if ('download_token' in response && !('download_url' in response)) {
		result.download_url = `${apiConfig.baseUrl}${apiConfig.endpoints.download}?token=${response.download_token}`
	}

	return result as T
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
			const fileJobId = jobId || uuidv4()
			const response = await uploadFile(file, fileJobId)
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
			const response = await convertFile(jobId, targetFormat, sourceFormat)
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
			// Generate a job ID
			const jobId = uuidv4()

			// Step 1: Upload the file
			const uploadResponse = await uploadFile(file, jobId)

			if (!uploadResponse.success) {
				throw new Error('Upload failed: ' + (uploadResponse.data.message || 'Unknown error'))
			}

			// Step 2: Start conversion
			const convertResponse = await convertFile(jobId, targetFormat, sourceFormat)

			if (!convertResponse.success) {
				throw new Error('Conversion failed: ' + (convertResponse.data.message || 'Unknown error'))
			}

			return standardizeResponse({
				job_id: jobId,
				task_id: jobId, // For backward compatibility
				status: convertResponse.data.status
			})
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
	getConversionStatus: async (jobId: string): Promise<ConversionStatusResponse> => {
		try {
			const response = await getJobStatus(jobId)
			return standardizeResponse(response.data) as ConversionStatusResponse
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
			const response = await getDownloadToken(jobId)
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
			const response = await closeSession()
			return response.data
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

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
	closeSession
} from '@/lib/api/apiClient'

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
	status: z.enum(['idle', 'pending', 'processing', 'completed', 'failed']),
	progress: z.number().min(0).max(100).optional(),
	download_url: z.string().url().optional().nullable(),
	filename: z.string().optional().nullable(),
	file_size: z.number().optional().nullable(),
	error: z.string().optional().nullable(),
	message: z.string().optional()
})

/**
 * API Client for interacting with the backend
 */
export const apiClient = {
	/**
	 * Initialize a session with the API
	 * @returns Session initialization response
	 */
	initSession: async () => {
		const response = await initSession()
		return response.data
	},

	/**
	 * Upload a file to the server
	 * @param file File to upload
	 * @param jobId Job ID for tracking
	 * @returns Upload response
	 */
	uploadFile: async (file: File, jobId: string) => {
		const response = await uploadFile(file, jobId)
		return response.data
	},

	/**
	 * Start the conversion process
	 * @param jobId Job ID of the uploaded file
	 * @param targetFormat Target format for conversion
	 * @returns Conversion response
	 */
	convertFile: async (jobId: string, targetFormat: string) => {
		const response = await convertFile(jobId, targetFormat)
		return response.data
	},

	/**
	 * Get the status of a conversion job
	 * @param jobId Job ID to check
	 * @returns Job status
	 */
	getConversionStatus: async (jobId: string) => {
		const response = await getJobStatus(jobId)
		return response.data
	},

	/**
	 * Get a download token for a completed job
	 * @param jobId Job ID to get download token for
	 * @returns Download token response
	 */
	getDownloadToken: async (jobId: string) => {
		const response = await getDownloadToken(jobId)
		return response.data
	},

	/**
	 * Close the current session
	 * @returns Session close response
	 */
	closeSession: async () => {
		const response = await closeSession()
		return response.data
	}
}

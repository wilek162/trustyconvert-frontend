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
import { v4 as uuidv4 } from 'uuid'

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
	status: z.enum(['idle', 'pending', 'uploaded', 'queued', 'processing', 'completed', 'failed']),
	progress: z.number().min(0).max(100).optional(),
	download_url: z.string().url().optional().nullable(),
	error_message: z.string().optional().nullable(),
	file_size: z.number().optional().nullable(),
	started_at: z.string().optional().nullable(),
	completed_at: z.string().optional().nullable()
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
	 * @param jobId Job ID for tracking (optional, will be generated if not provided)
	 * @returns Upload response
	 */
	uploadFile: async (file: File, jobId?: string) => {
		const fileJobId = jobId || uuidv4()
		const response = await uploadFile(file, fileJobId)
		return response.data
	},

	/**
	 * Start the conversion process
	 * @param jobId Job ID of the uploaded file
	 * @param targetFormat Target format for conversion
	 * @param sourceFormat Optional source format (usually auto-detected)
	 * @returns Conversion response
	 */
	convertFile: async (jobId: string, targetFormat: string, sourceFormat?: string) => {
		const response = await convertFile(jobId, targetFormat, sourceFormat)
		return response.data
	},

	/**
	 * Convenience method to upload and convert in one step
	 * @param file File to upload and convert
	 * @param targetFormat Target format for conversion
	 * @returns Job ID and initial status
	 */
	startConversion: async (file: File, targetFormat: string) => {
		// Generate a job ID
		const jobId = uuidv4()

		// Step 1: Upload the file
		await uploadFile(file, jobId)

		// Step 2: Start conversion
		const convertResponse = await convertFile(jobId, targetFormat)

		return {
			job_id: jobId,
			task_id: jobId, // For backward compatibility
			status: convertResponse.data.status
		}
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
			console.error('Error fetching supported formats:', error)
			return []
		}
	},

	/**
	 * Get the download URL for a job
	 * @param downloadToken Download token
	 * @returns Full download URL
	 */
	getDownloadUrl: (downloadToken: string): string => {
		// Construct the download URL using the current origin
		const baseUrl = window.location.origin
		return `${baseUrl}/api/download?token=${downloadToken}`
	}
}

/**
 * API Client for the TrustyConvert backend
 *
 * Features:
 * - Type-safe API calls with Zod validation
 * - Automatic retries for transient errors
 * - CSRF protection
 * - Progress tracking
 * - Comprehensive error handling
 */

import { z } from 'zod'

import { csrfToken } from '@/lib/stores/session'

import type { TaskStatus, ConversionFormat } from './types'

// API Response Schemas
export const InitialConversionResponseSchema = z.object({
	task_id: z.string(),
	status: z.enum(['pending', 'processing', 'completed', 'failed']),
	status_url: z.string()
})

export const ConversionStatusResponseSchema = z.object({
	task_id: z.string().optional(),
	status: z.enum(['pending', 'processing', 'completed', 'failed']),
	progress: z.number().min(0).max(100).optional().nullable(),
	filename: z.string().optional().nullable(),
	error: z.string().optional().nullable(),
	error_details: z.record(z.unknown()).optional().nullable(),
	download_url: z.string().optional().nullable(),
	created_at: z.string().optional().nullable(),
	updated_at: z.string().optional().nullable(),
	file_id: z.string().optional().nullable(),
	source_format: z.string().optional().nullable(),
	target_format: z.string().optional().nullable(),
	file_size: z.number().optional().nullable(),
	completed_at: z.string().optional().nullable()
})

export const ConversionFormatSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	maxSize: z.number(),
	features: z.array(z.string()),
	inputFormats: z.array(z.string()),
	outputFormats: z.array(z.string())
})

export const APIErrorSchema = z.object({
	code: z.string(),
	message: z.string(),
	details: z.record(z.unknown()).optional()
})

export const SupportedFormatsResponseSchema = z.object({
	data: z.array(ConversionFormatSchema),
	success: z.boolean()
})

export const SessionInitResponseSchema = z.object({
	data: z.object({
		csrf_token: z.string()
	}),
	success: z.boolean()
})

// API Error Classes
export class APIRequestError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly details?: Record<string, unknown>
	) {
		super(message)
		this.name = 'APIRequestError'
	}
}

export class ValidationError extends Error {
	constructor(
		message: string,
		public readonly field?: string
	) {
		super(message)
		this.name = 'ValidationError'
	}
}

export class NetworkError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'NetworkError'
	}
}

// API Client Configuration
const API_BASE_URL = import.meta.env.PUBLIC_API_URL || '/api'
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

/**
 * Helper function to delay execution
 * @param ms Milliseconds to delay
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Handles API response validation and error processing
 * @param response Fetch Response object
 * @param schema Zod schema for response validation
 * @returns Parsed and validated response data
 * @throws APIRequestError | ValidationError
 */
const handleResponse = async <T>(response: Response, schema: z.ZodType<T>): Promise<T> => {
	if (!response.ok) {
		const error = await response.json().catch(() => ({}))
		console.error('[API] Response not OK:', { status: response.status, error })

		try {
			const apiError = APIErrorSchema.parse(error)
			throw new APIRequestError(apiError.message, apiError.code, apiError.details)
		} catch (e) {
			if (response.status === 400) {
				throw new ValidationError('Invalid request data')
			} else if (response.status === 401) {
				throw new APIRequestError('Unauthorized', 'UNAUTHORIZED')
			} else if (response.status === 403) {
				throw new APIRequestError('Forbidden', 'FORBIDDEN')
			} else if (response.status === 404) {
				throw new APIRequestError('Resource not found', 'NOT_FOUND')
			} else if (response.status >= 500) {
				throw new APIRequestError('Server error', 'SERVER_ERROR')
			} else {
				throw new APIRequestError('Unknown error', 'UNKNOWN')
			}
		}
	}

	const data = await response.json()
	console.log('[API] Response data:', data)
	try {
		return schema.parse(data)
	} catch (error) {
		console.error('[API] Validation error:', error)
		if (error instanceof z.ZodError) {
			console.error('[API] Validation details:', error.errors)
		}
		throw new ValidationError('Invalid response data')
	}
}

export interface DownloadProgress {
	loaded: number
	total: number
	startTime: number
}

export interface DownloadOptions {
	onProgress?: (progress: DownloadProgress) => void
	signal?: AbortSignal
}

/**
 * API Client class for making requests to the backend
 * Implements retry logic, error handling, and response validation
 */
export class APIClient {
	/**
	 * Makes a fetch request with retry logic and error handling
	 * @param input Request URL or Request object
	 * @param init Request initialization options
	 * @param schema Zod schema for response validation
	 * @returns Parsed and validated response data
	 */
	private async fetch<T>(input: RequestInfo, init: RequestInit, schema: z.ZodType<T>): Promise<T> {
		let lastError: Error | null = null

		for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
			try {
				const token = csrfToken.get()
				const response = await fetch(input, {
					...init,
					headers: {
						...init.headers,
						'X-CSRF-Token': token || '',
						Accept: 'application/json'
					}
				})
				return await handleResponse(response, schema)
			} catch (error) {
				lastError = error as Error
				if (error instanceof APIRequestError) {
					// Don't retry client errors
					if (error.code.startsWith('4')) throw error
				}
				if (attempt < MAX_RETRIES - 1) {
					await delay(RETRY_DELAY * Math.pow(2, attempt))
					continue
				}
			}
		}

		throw lastError || new NetworkError('Request failed')
	}

	/**
	 * Start a file conversion task
	 * @param file File to convert
	 * @param targetFormat Target format for conversion
	 * @returns Initial conversion response with task ID and status
	 */
	async startConversion(
		file: File,
		targetFormat: string
	): Promise<z.infer<typeof InitialConversionResponseSchema>> {
		const formData = new FormData()
		formData.append('file', file)

		return this.fetch(
			`${API_BASE_URL}/convert?target_format=${encodeURIComponent(targetFormat)}`,
			{
				method: 'POST',
				body: formData
			},
			InitialConversionResponseSchema
		)
	}

	/**
	 * Get the status of a conversion task with optimized polling
	 * @param taskId ID of the conversion task
	 * @param options Polling options
	 * @returns Task status object
	 */
	async getConversionStatus(
		taskId: string,
		options?: {
			signal?: AbortSignal
			retryCount?: number
			retryDelay?: number
		}
	): Promise<z.infer<typeof ConversionStatusResponseSchema>> {
		const { signal, retryCount = MAX_RETRIES, retryDelay = RETRY_DELAY } = options || {}

		return this.fetch(
			`${API_BASE_URL}/convert/${taskId}/status`,
			{
				method: 'GET',
				signal
			},
			ConversionStatusResponseSchema
		).catch((error) => {
			if (error instanceof APIRequestError && error.code === 'NOT_FOUND') {
				throw new APIRequestError('Conversion task not found', 'TASK_NOT_FOUND')
			}
			throw error
		})
	}

	/**
	 * Download a converted file with progress tracking
	 * @param taskId ID of the conversion task
	 * @param options Download options including progress callback
	 * @returns Blob of the converted file
	 */
	async downloadConvertedFile(taskId: string, options: DownloadOptions = {}): Promise<Blob> {
		const { onProgress, signal } = options
		const startTime = Date.now()

		const response = await fetch(`${API_BASE_URL}/convert/${taskId}/download`, {
			headers: {
				'X-CSRF-Token': csrfToken.get() || ''
			},
			signal
		})

		if (!response.ok) {
			const error = await response.json().catch(() => ({}))
			try {
				const apiError = APIErrorSchema.parse(error)
				throw new APIRequestError(apiError.message, apiError.code, apiError.details)
			} catch (e) {
				if (response.status === 404) {
					throw new APIRequestError('File not found', 'FILE_NOT_FOUND')
				} else if (response.status === 403) {
					throw new APIRequestError('Access denied', 'ACCESS_DENIED')
				} else {
					throw new APIRequestError('Failed to download file', 'DOWNLOAD_FAILED')
				}
			}
		}

		const contentLength = response.headers.get('Content-Length')
		const total = contentLength ? parseInt(contentLength, 10) : 0
		let loaded = 0

		// Create a ReadableStream to track progress
		const reader = response.body?.getReader()
		if (!reader) {
			throw new APIRequestError('Failed to read response stream', 'STREAM_ERROR')
		}

		const chunks: Uint8Array[] = []
		while (true) {
			const { done, value } = await reader.read()
			if (done) break

			chunks.push(value)
			loaded += value.length

			if (onProgress) {
				onProgress({
					loaded,
					total,
					startTime
				})
			}
		}

		// Combine chunks into a single Blob
		return new Blob(chunks, {
			type: response.headers.get('Content-Type') || 'application/octet-stream'
		})
	}

	/**
	 * Cancel a conversion task
	 * @param taskId ID of the conversion task
	 */
	async cancelConversion(taskId: string): Promise<void> {
		await this.fetch(
			`${API_BASE_URL}/convert/${taskId}/cancel`,
			{
				method: 'POST'
			},
			z.object({
				success: z.boolean(),
				message: z.string()
			})
		)
	}

	/**
	 * Get supported conversion formats
	 * @returns List of supported conversion formats
	 */
	async getSupportedFormats(): Promise<ConversionFormat[]> {
		const response = await this.fetch(
			`${API_BASE_URL}/supported-conversions`,
			{
				method: 'GET'
			},
			SupportedFormatsResponseSchema
		)
		return response.data
	}

	/**
	 * Initialize a new session
	 * @returns Session initialization response with CSRF token
	 */
	async initSession(): Promise<{ csrf_token: string }> {
		const response = await this.fetch(
			`${API_BASE_URL}/session/init`,
			{
				method: 'POST'
			},
			SessionInitResponseSchema
		)
		return response.data
	}
}

// Export a singleton instance
export const apiClient = new APIClient()	
/**
 * API client for TrustyConvert backend
 *
 * Provides type-safe API endpoints with centralized error handling,
 * session management, and consistent request/response patterns.
 */

import { getCSRFToken, setCSRFToken, setInitializing } from '@/lib/stores/session'
import type {
	ApiResponse,
	SessionInitResponse,
	UploadResponse,
	JobStatusResponse,
	DownloadTokenResponse,
	ConvertResponse,
	SessionCloseResponse
} from '@/lib/types/api'
import { NetworkError, SessionError, ValidationError, handleError } from '@/lib/utils/errorHandling'

// Configuration
const API_BASE_URL = import.meta.env.PUBLIC_API_URL || '/api'
const DEFAULT_TIMEOUT = 30000 // 30 seconds
const MAX_RETRIES = 2

/**
 * API request options with timeout and retry settings
 */
interface ApiRequestOptions extends RequestInit {
	timeout?: number
	retries?: number
	skipAuthCheck?: boolean
}

/**
 * Extended API response data with error fields
 */
interface ApiErrorData {
	error?: string
	error_message?: string
	message?: string
	validation_errors?: Record<string, string>
	field_errors?: Record<string, string>
	session_expired?: boolean
	csrf_error?: boolean
	[key: string]: any
}

/**
 * Execute a fetch request with timeout and retry logic
 *
 * @param url - Request URL
 * @param options - Extended fetch options
 * @returns Fetch response
 */
async function fetchWithTimeout(url: string, options: ApiRequestOptions = {}): Promise<Response> {
	const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options

	// Create abort controller for timeout
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), timeout)

	try {
		const response = await fetch(url, {
			...fetchOptions,
			signal: controller.signal
		})

		return response
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			throw new NetworkError({
				message: `Request timeout after ${timeout}ms`,
				userMessage: 'The request timed out. Please try again.'
			})
		}
		throw error
	} finally {
		clearTimeout(timeoutId)
	}
}

/**
 * Execute a fetch request with retries
 *
 * @param url - Request URL
 * @param options - Extended fetch options
 * @returns Fetch response
 */
async function fetchWithRetry(url: string, options: ApiRequestOptions = {}): Promise<Response> {
	const { retries = MAX_RETRIES, ...fetchOptions } = options

	let lastError: Error | null = null

	for (let attempt = 0; attempt <= retries; attempt++) {
		try {
			// Add retry attempt to headers for logging
			const headers = new Headers(fetchOptions.headers)
			if (attempt > 0) {
				headers.set('X-Retry-Attempt', attempt.toString())
			}

			return await fetchWithTimeout(url, {
				...fetchOptions,
				headers
			})
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error))

			// Don't retry client aborts or certain response codes
			if (lastError.name === 'AbortError') {
				throw lastError
			}

			// Last attempt failed
			if (attempt === retries) {
				throw lastError
			}

			// Wait before retry with exponential backoff (300ms, 900ms, 2700ms)
			const delay = Math.min(300 * Math.pow(3, attempt), 10000)
			await new Promise((resolve) => setTimeout(resolve, delay))
		}
	}

	// This should not happen due to the loop above
	throw lastError || new Error('Retry failed for unknown reason')
}

/**
 * Process API response and extract data
 *
 * @param response - Fetch response
 * @param endpoint - API endpoint for error context
 * @returns Typed API response data
 */
async function processApiResponse<T>(
	response: Response,
	endpoint: string
): Promise<ApiResponse<T>> {
	// Handle HTTP errors
	if (!response.ok) {
		if (response.status === 401 || response.status === 403) {
			throw new SessionError({
				message: `Authentication error: ${response.status} ${response.statusText}`,
				userMessage: 'Your session has expired. Please refresh the page.',
				context: { endpoint, statusCode: response.status }
			})
		}

		// Try to parse error response
		try {
			const errorData = await response.json()
			throw new NetworkError({
				message: `API error: ${response.status} ${response.statusText}`,
				userMessage: errorData.message || 'Server error. Please try again later.',
				context: {
					endpoint,
					statusCode: response.status,
					errorData
				}
			})
		} catch (parseError) {
			// Couldn't parse JSON error
			throw new NetworkError({
				message: `API error: ${response.status} ${response.statusText}`,
				userMessage: 'Server error. Please try again later.',
				context: { endpoint, statusCode: response.status }
			})
		}
	}

	// Parse JSON response
	try {
		const data: ApiResponse<T> = await response.json()

		// Handle API-level errors
		if (!data.success) {
			const errorData = data.data as unknown as ApiErrorData
			const errorMessage =
				errorData.error || errorData.error_message || errorData.message || 'API request failed'

			// Determine error type
			if (errorData.validation_errors || errorData.field_errors) {
				throw new ValidationError({
					message: `Validation error: ${errorMessage}`,
					userMessage: errorMessage,
					fieldErrors: errorData.validation_errors || errorData.field_errors,
					context: { endpoint, data }
				})
			}

			if (errorData.session_expired || errorData.csrf_error) {
				throw new SessionError({
					message: `Session error: ${errorMessage}`,
					userMessage: errorMessage,
					context: { endpoint, data }
				})
			}

			throw new NetworkError({
				message: `API error: ${errorMessage}`,
				userMessage: errorMessage,
				context: { endpoint, data }
			})
		}

		return data
	} catch (error) {
		// Rethrow AppErrors
		if (error instanceof Error && 'type' in error) {
			throw error
		}

		// Handle JSON parsing errors
		throw new NetworkError({
			message: 'Failed to parse API response',
			userMessage: 'Received invalid response from server.',
			originalError: error instanceof Error ? error : undefined,
			context: { endpoint }
		})
	}
}

/**
 * Base fetch wrapper that handles API responses and CSRF tokens
 * @param endpoint API endpoint path
 * @param options Fetch options
 * @returns Typed API response
 */
async function apiFetch<T>(
	endpoint: string,
	options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
	const { skipAuthCheck = false, ...fetchOptions } = options
	const csrfToken = getCSRFToken()

	// Check for CSRF token if required
	if (!skipAuthCheck && !csrfToken && endpoint !== '/session/init') {
		throw new SessionError({
			message: 'CSRF token not available',
			userMessage: 'Your session has expired. Please refresh the page.',
			context: { endpoint }
		})
	}

	// Add CSRF token and standard headers
	const headers = new Headers(fetchOptions.headers)
	if (csrfToken) {
		headers.set('X-CSRF-Token', csrfToken)
	}

	// Only set content-type for JSON requests
	if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
		headers.set('Content-Type', 'application/json')
	}

	try {
		const url = `${API_BASE_URL}${endpoint}`
		const response = await fetchWithRetry(url, {
			...fetchOptions,
			headers,
			credentials: 'include' // Include cookies in request
		})

		return await processApiResponse<T>(response, endpoint)
	} catch (error) {
		// Log and rethrow
		console.error(`API error (${endpoint}):`, error)
		throw error
	}
}

/**
 * Initialize a new session and get CSRF token
 * @returns Session init response with CSRF token
 */
export async function initSession(): Promise<ApiResponse<SessionInitResponse>> {
	setInitializing(true)

	try {
		const data = await apiFetch<SessionInitResponse>('/session/init', {
			method: 'GET',
			skipAuthCheck: true
		})

		if (data.success && data.data.csrf_token) {
			setCSRFToken(data.data.csrf_token)
		}

		return data
	} catch (error) {
		handleError(error, { context: { action: 'initSession' } })
		throw error
	} finally {
		// Always mark initialization as complete
		setInitializing(false)
	}
}

/**
 * Upload a file to the server
 * @param file File to upload
 * @param jobId UUID for the job
 * @returns Upload response
 */
export async function uploadFile(file: File, jobId: string): Promise<ApiResponse<UploadResponse>> {
	const formData = new FormData()
	formData.append('file', file)
	formData.append('job_id', jobId)

	try {
		// For large files, increase the timeout
		const timeout = Math.max(DEFAULT_TIMEOUT, file.size / 10240) // 10KB/s minimum upload speed

		return await apiFetch<UploadResponse>('/upload', {
			method: 'POST',
			body: formData,
			timeout,
			// Don't set Content-Type header for FormData
			headers: {}
		})
	} catch (error) {
		handleError(error, { context: { action: 'uploadFile', jobId, fileName: file.name } })
		throw error
	}
}

/**
 * Start file conversion
 * @param jobId Job ID of the uploaded file
 * @param targetFormat Target format for conversion
 * @returns Conversion response
 */
export async function convertFile(
	jobId: string,
	targetFormat: string
): Promise<ApiResponse<ConvertResponse>> {
	try {
		return await apiFetch<ConvertResponse>('/convert', {
			method: 'POST',
			body: JSON.stringify({ job_id: jobId, target_format: targetFormat })
		})
	} catch (error) {
		handleError(error, { context: { action: 'convertFile', jobId, targetFormat } })
		throw error
	}
}

/**
 * Get job status
 * @param jobId Job ID to check status for
 * @returns Job status response
 */
export async function getJobStatus(jobId: string): Promise<ApiResponse<JobStatusResponse>> {
	try {
		return await apiFetch<JobStatusResponse>(`/job_status?job_id=${jobId}`, {
			method: 'GET'
		})
	} catch (error) {
		// Don't report polling errors to avoid noise
		handleError(error, { context: { action: 'getJobStatus', jobId }, silent: true })
		throw error
	}
}

/**
 * Get download token for a completed job
 * @param jobId Job ID to get download token for
 * @returns Download token response
 */
export async function getDownloadToken(jobId: string): Promise<ApiResponse<DownloadTokenResponse>> {
	try {
		return await apiFetch<DownloadTokenResponse>('/download_token', {
			method: 'POST',
			body: JSON.stringify({ job_id: jobId })
		})
	} catch (error) {
		handleError(error, { context: { action: 'getDownloadToken', jobId } })
		throw error
	}
}

/**
 * Close the current session and clean up resources
 * @returns Session close response
 */
export async function closeSession(): Promise<ApiResponse<SessionCloseResponse>> {
	try {
		return await apiFetch<SessionCloseResponse>('/session/close', {
			method: 'POST'
		})
	} catch (error) {
		handleError(error, { context: { action: 'closeSession' } })
		throw error
	}
}

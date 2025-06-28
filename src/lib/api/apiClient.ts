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
	SessionCloseResponse,
	FormatsResponse
} from '@/lib/types/api'
import { NetworkError, SessionError, ValidationError, handleError } from '@/lib/utils/errorHandling'
import { apiConfig } from './config'

// Configuration
const API_BASE_URL = apiConfig.baseUrl
const DEFAULT_TIMEOUT = apiConfig.timeout
const MAX_RETRIES = apiConfig.retryAttempts

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
		// Check if we're in development mode to handle self-signed certificates
		const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development'

		// Create fetch options with proper signal
		const fetchOpts = {
			...fetchOptions,
			signal: controller.signal
		}

		// In development, we need to ignore SSL certificate errors for self-signed certs
		if (isDev && typeof window !== 'undefined') {
			// For browser environments, we rely on the NODE_TLS_REJECT_UNAUTHORIZED env var
			// The browser will show a warning but allow the connection if user accepts
			console.warn('Development mode: Using self-signed certificate')
		}

		const response = await fetch(url, fetchOpts)
		return response
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			throw new NetworkError({
				message: `Request timeout after ${timeout}ms`,
				userMessage: 'The request timed out. Please try again.'
			})
		}

		// Handle certificate errors more gracefully
		if (error instanceof Error && error.message.includes('certificate')) {
			console.error('Certificate error:', error)
			throw new NetworkError({
				message: 'SSL Certificate validation failed',
				userMessage: 'Connection security error. Please check your SSL configuration.',
				originalError: error
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
 *
 * @param endpoint - API endpoint path
 * @param options - Extended fetch options
 * @returns Typed API response
 */
async function apiFetch<T>(
	endpoint: string,
	options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
	const { skipAuthCheck = false, ...fetchOptions } = options

	// Ensure we have a valid session for non-init requests
	if (!skipAuthCheck && !endpoint.includes('/session/init') && !getCSRFToken()) {
		throw new SessionError({
			message: 'No CSRF token available for request',
			userMessage: 'Your session has expired. Please refresh the page.',
			context: { endpoint }
		})
	}

	// Construct full URL
	const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`

	// Set up headers with CSRF token
	const headers = new Headers(fetchOptions.headers || {})

	// Add CSRF token to header for state-changing requests
	if (!skipAuthCheck && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(fetchOptions.method || '')) {
		const csrfToken = getCSRFToken()
		if (csrfToken) {
			headers.set(apiConfig.csrfTokenHeader, csrfToken)
		}
	}

	// Always include credentials for cookies
	const response = await fetchWithRetry(url, {
		...fetchOptions,
		headers,
		credentials: 'include'
	})

	return processApiResponse<T>(response, endpoint)
}

/**
 * Initialize a new session with the API
 * Sets session and CSRF cookies
 *
 * @returns Session initialization response
 */
export async function initSession(): Promise<ApiResponse<SessionInitResponse>> {
	try {
		const response = await apiFetch<SessionInitResponse>(apiConfig.endpoints.sessionInit, {
			method: 'GET',
			skipAuthCheck: true
		})

		// Store the CSRF token from the response
		if (response.success && response.data.csrf_token) {
			setCSRFToken(response.data.csrf_token, response.data.id, response.data.expires_at)
			setInitializing(false)
		}

		return response
	} catch (error) {
		setInitializing(false)
		throw error
	}
}

/**
 * Upload a file to the server
 *
 * @param file - File to upload
 * @param jobId - UUID4 string for tracking the job
 * @returns Upload response
 */
export async function uploadFile(file: File, jobId: string): Promise<ApiResponse<UploadResponse>> {
	// Create form data with file and job ID
	const formData = new FormData()
	formData.append('file', file)
	formData.append('job_id', jobId)

	return apiFetch<UploadResponse>(apiConfig.endpoints.upload, {
		method: 'POST',
		body: formData
	})
}

/**
 * Convert an uploaded file
 *
 * @param jobId - Job ID of the uploaded file
 * @param targetFormat - Target format for conversion
 * @param sourceFormat - Optional source format (usually auto-detected)
 * @returns Conversion response
 */
export async function convertFile(
	jobId: string,
	targetFormat: string,
	sourceFormat?: string
): Promise<ApiResponse<ConvertResponse>> {
	// Create request body
	const body: Record<string, string> = {
		job_id: jobId,
		target_format: targetFormat
	}

	// Add source format if provided
	if (sourceFormat) {
		body.source_format = sourceFormat
	}

	return apiFetch<ConvertResponse>(apiConfig.endpoints.convert, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	})
}

/**
 * Get the status of a conversion job
 *
 * @param jobId - Job ID to check
 * @returns Job status response
 */
export async function getJobStatus(jobId: string): Promise<ApiResponse<JobStatusResponse>> {
	return apiFetch<JobStatusResponse>(`${apiConfig.endpoints.jobStatus}?job_id=${jobId}`, {
		method: 'GET'
	})
}

/**
 * Get a download token for a completed job
 *
 * @param jobId - Job ID to get download token for
 * @returns Download token response
 */
export async function getDownloadToken(jobId: string): Promise<ApiResponse<DownloadTokenResponse>> {
	return apiFetch<DownloadTokenResponse>(apiConfig.endpoints.downloadToken, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ job_id: jobId })
	})
}

/**
 * Close the current session
 * Cleans up session, deletes cookies and files
 *
 * @returns Session close response
 */
export async function closeSession(): Promise<ApiResponse<SessionCloseResponse>> {
	return apiFetch<SessionCloseResponse>(apiConfig.endpoints.sessionClose, {
		method: 'POST'
	})
}

/**
 * Get supported conversion formats
 *
 * @returns Formats response
 */
export async function getSupportedFormats(): Promise<ApiResponse<FormatsResponse>> {
	return apiFetch<FormatsResponse>(apiConfig.endpoints.formats, {
		method: 'GET'
	})
}

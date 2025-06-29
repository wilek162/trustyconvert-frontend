/**
 * API client for TrustyConvert backend
 *
 * Provides type-safe API endpoints with centralized error handling,
 * session management, and consistent request/response patterns.
 */

import { getCSRFToken, setCSRFToken } from '@/lib/stores/session'
import {
	getCsrfHeaders,
	validateCsrfToken,
	handleCsrfError,
	getCsrfTokenFromHeaders
} from '@/lib/utils/csrfUtils'
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
import { withRetry, RETRY_STRATEGIES, isRetryableError } from '@/lib/utils/retry'
import { debugLog, debugError } from '@/lib/utils/debug'
import { sessionManager } from './sessionManager'

// Configuration
const API_BASE_URL = apiConfig.baseUrl
const DEFAULT_TIMEOUT = apiConfig.timeout

/**
 * API request options with timeout and retry settings
 */
interface ApiRequestOptions extends RequestInit {
	timeout?: number
	skipAuthCheck?: boolean
	skipCsrfCheck?: boolean
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
 * Execute a fetch request with timeout
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

		// In development, we need to handle CORS and SSL issues
		if (isDev && typeof window !== 'undefined') {
			// For browser environments in development mode
			debugLog('Development mode: Using self-signed certificate and handling CORS')

			// Add mode: 'cors' to explicitly enable CORS
			fetchOpts.mode = 'cors'

			// Always include credentials for CORS requests
			fetchOpts.credentials = 'include'

			// Ensure headers are properly set
			const headers = new Headers(fetchOpts.headers || {})
			headers.set('Origin', window.location.origin)
			fetchOpts.headers = headers
		}

		const response = await fetch(url, fetchOpts)

		// Check for CSRF token in response headers
		const csrfToken = getCsrfTokenFromHeaders(response.headers)
		if (csrfToken) {
			debugLog('Found CSRF token in response headers, updating store')
			setCSRFToken(csrfToken)
		}

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
			debugError('Certificate error:', error)
			throw new NetworkError({
				message: 'SSL Certificate validation failed',
				userMessage: 'Connection security error. Please check your SSL configuration.',
				originalError: error
			})
		}

		// Handle CORS errors more gracefully
		if (
			error instanceof Error &&
			(error.message.includes('CORS') ||
				error.message.includes('cross-origin') ||
				error.message.includes('Cross-Origin'))
		) {
			debugError('CORS error:', error)
			throw new NetworkError({
				message: 'CORS policy violation: Cross-origin request blocked',
				userMessage:
					'There was a problem connecting to the server. Please check your network settings.',
				originalError: error
			})
		}

		throw error
	} finally {
		clearTimeout(timeoutId)
	}
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
			// Check if this is a CSRF error
			const isCSRFError = response.headers.get('X-CSRF-Error') === 'true'

			debugError('Authentication error', {
				endpoint,
				status: response.status,
				isCSRFError
			})

			// Attempt to refresh the session automatically
			// Don't await to prevent blocking the error response
			sessionManager.reset(true).catch((e) => {
				debugError('Failed to reset session after auth error', e)
			})

			if (isCSRFError) {
				debugError('CSRF token validation failed', { endpoint, status: response.status })
				// Handle CSRF error but don't await it to prevent potential deadlocks
				// This is safe because handleCsrfError has its own error handling
				handleCsrfError().catch((e) => {
					debugError('Error while handling CSRF error', e)
				})
			}

			throw new SessionError({
				message: `Authentication error: ${response.status} ${response.statusText}`,
				userMessage: 'Your session has expired. Please refresh the page.',
				context: { endpoint, statusCode: response.status, isCSRFError }
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
				// Attempt to refresh the session automatically
				// Don't await to prevent blocking the error response
				sessionManager.reset(true).catch((e) => {
					debugError('Failed to reset session after session expired error', e)
				})

				// Handle CSRF errors
				if (errorData.csrf_error) {
					debugError('API reported CSRF error', { endpoint })
					// Handle CSRF error but don't await it to prevent potential deadlocks
					handleCsrfError().catch((e) => {
						debugError('Error while handling CSRF error', e)
					})
				}

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

		// Wrap other errors
		throw new NetworkError({
			message: `Failed to parse API response: ${String(error)}`,
			userMessage: 'There was a problem processing the server response.',
			originalError: error instanceof Error ? error : undefined,
			context: { endpoint }
		})
	}
}

/**
 * Make an API request with proper error handling
 *
 * @param endpoint - API endpoint
 * @param options - Request options
 * @returns Typed API response
 */
async function makeRequest<T>(
	endpoint: string,
	options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
	const url = `${API_BASE_URL}${endpoint}`

	// Add CSRF token header if not explicitly skipped
	if (!options.skipCsrfCheck) {
		const headers = new Headers(options.headers || {})
		const csrfHeaders = getCsrfHeaders()

		// Add CSRF headers if available
		Object.entries(csrfHeaders).forEach(([key, value]) => {
			headers.set(key, value)
		})

		options.headers = headers
	}

	// Always include credentials for cookies
	options.credentials = 'include'

	debugLog(`API Request: ${options.method || 'GET'} ${endpoint}`)
	const response = await fetchWithTimeout(url, options)

	// Extract and store CSRF token from response headers if present
	const csrfToken = getCsrfTokenFromHeaders(response.headers)
	if (csrfToken) {
		debugLog('Found CSRF token in response headers, updating store')
		setCSRFToken(csrfToken)
	}

	return processApiResponse<T>(response, endpoint)
}

/**
 * Make an API request with retry logic
 *
 * @param endpoint - API endpoint
 * @param options - Request options
 * @returns Typed API response
 */
export async function apiFetch<T>(
	endpoint: string,
	options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
	// Ensure we have a valid session before making requests
	// Skip this check for session initialization to prevent loops
	if (!options.skipAuthCheck && endpoint !== apiConfig.endpoints.sessionInit) {
		const token = getCSRFToken()
		if (!token) {
			debugLog('No CSRF token available, initializing session before request')
			// Import and call sessionManager dynamically to prevent circular dependencies
			const { sessionManager } = await import('./sessionManager')
			await sessionManager.initialize()
		}
	}

	// Use retry logic for all API requests
	return withRetry(() => makeRequest<T>(endpoint, options), {
		...RETRY_STRATEGIES.API_REQUEST,
		isRetryable: (error: Error) => {
			// Don't retry session errors (401/403) unless it's a CSRF error
			if (error instanceof SessionError) {
				// Only retry if it's a CSRF error
				const isCSRFError = error.context?.isCSRFError === true
				return isCSRFError
			}

			// Use default retry condition for other errors
			return isRetryableError(error)
		},
		onRetry: async (error: Error, attempt: number) => {
			debugLog(`Retrying API request to ${endpoint} (attempt ${attempt})`, {
				error: error.message
			})

			// If it's a session error, try to refresh the session before retry
			if (error instanceof SessionError) {
				debugLog('Session error detected, refreshing session before retry')
				// Import and call sessionManager dynamically to prevent circular dependencies
				const { sessionManager } = await import('./sessionManager')
				await sessionManager.reset(true)
			}
		}
	})
}

// Module-level variables to track initialization attempts
let isInitializingSession = false
let lastInitResponse: ApiResponse<SessionInitResponse> | null = null
let initializationTimeout: ReturnType<typeof setTimeout> | null = null

/**
 * Initialize a session with the API
 * This sets up session cookies and CSRF token
 *
 * @returns Session initialization response
 */
export async function initSession(): Promise<ApiResponse<SessionInitResponse>> {
	// If we're already initializing, return a promise that resolves with the last response
	// or rejects after a timeout
	if (isInitializingSession) {
		console.log('Session initialization already in progress, waiting for completion')
		return new Promise((resolve, reject) => {
			// Wait for up to 5 seconds for the initialization to complete
			const timeout = setTimeout(() => {
				if (lastInitResponse) {
					resolve(lastInitResponse)
				} else {
					// This should rarely happen - only if the first initialization is taking too long
					console.warn('Session initialization timeout, returning empty response')
					resolve({
						success: true,
						data: { id: '', csrf_token: '', expires_at: '' },
						correlation_id: ''
					})
				}
			}, 5000)

			// Check every 100ms if initialization has completed
			const interval = setInterval(() => {
				if (!isInitializingSession && lastInitResponse) {
					clearTimeout(timeout)
					clearInterval(interval)
					resolve(lastInitResponse)
				}
			}, 100)
		})
	}

	// Set initializing flag
	isInitializingSession = true

	// Clear any existing timeout
	if (initializationTimeout) {
		clearTimeout(initializationTimeout)
	}

	// Set a timeout to reset the flag in case of errors
	initializationTimeout = setTimeout(() => {
		if (isInitializingSession) {
			debugError('Session initialization timeout exceeded, resetting flag')
			isInitializingSession = false
		}
	}, 10000) // 10 second timeout

	try {
		const response = await apiFetch<SessionInitResponse>(apiConfig.endpoints.sessionInit, {
			method: 'GET',
			skipAuthCheck: true // Skip CSRF check for session init
		})

		// Store CSRF token if returned directly in the response data
		if (response.success && response.data && response.data.csrf_token) {
			debugLog('Received CSRF token directly in API response data', {
				sessionId: response.data.id,
				hasToken: !!response.data.csrf_token
			})
			setCSRFToken(response.data.csrf_token, response.data.id, response.data.expires_at)
		}
		// If no token in response data, we'll rely on the cookie that should have been set

		// Store the response for future duplicate calls
		lastInitResponse = response
		return response
	} catch (error) {
		throw handleError(error, {
			context: { action: 'initSession' }
		})
	} finally {
		// Reset initializing flag
		isInitializingSession = false

		// Clear the timeout
		if (initializationTimeout) {
			clearTimeout(initializationTimeout)
			initializationTimeout = null
		}
	}
}

/**
 * Upload a file to the server
 * Requires valid session and CSRF token
 *
 * @param file - File to upload
 * @param jobId - Job ID for tracking
 * @returns Upload response
 */
export async function uploadFile(file: File, jobId: string): Promise<ApiResponse<UploadResponse>> {
	try {
		// Create form data with file and job_id
		const formData = new FormData()
		formData.append('file', file)
		formData.append('job_id', jobId)

		return await apiFetch<UploadResponse>(apiConfig.endpoints.upload, {
			method: 'POST',
			body: formData
		})
	} catch (error) {
		throw handleError(error, {
			context: { action: 'uploadFile', fileName: file.name, fileSize: file.size, jobId }
		})
	}
}

/**
 * Convert an uploaded file
 * Requires valid session, CSRF token, and previously uploaded file
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
	try {
		// Create request body
		const body: Record<string, any> = {
			job_id: jobId,
			target_format: targetFormat
		}

		// Add source format if provided
		if (sourceFormat) {
			body.source_format = sourceFormat
		}

		return await apiFetch<ConvertResponse>(apiConfig.endpoints.convert, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		})
	} catch (error) {
		throw handleError(error, {
			context: { action: 'convertFile', jobId, targetFormat, sourceFormat }
		})
	}
}

/**
 * Get the status of a conversion job
 *
 * @param jobId - Job ID to check status for
 * @returns Job status response
 */
export async function getJobStatus(jobId: string): Promise<ApiResponse<JobStatusResponse>> {
	try {
		return await apiFetch<JobStatusResponse>(`${apiConfig.endpoints.jobStatus}?job_id=${jobId}`, {
			method: 'GET'
		})
	} catch (error) {
		throw handleError(error, {
			context: { action: 'getJobStatus', jobId }
		})
	}
}

/**
 * Get a download token for a completed conversion job
 * Requires valid session and CSRF token
 *
 * @param jobId - Job ID to get download token for
 * @returns Download token response
 */
export async function getDownloadToken(jobId: string): Promise<ApiResponse<DownloadTokenResponse>> {
	try {
		return await apiFetch<DownloadTokenResponse>(apiConfig.endpoints.downloadToken, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ job_id: jobId })
		})
	} catch (error) {
		throw handleError(error, {
			context: { action: 'getDownloadToken', jobId }
		})
	}
}

/**
 * Close the current session
 * This cleans up session data and files on the server
 *
 * @returns Session close response
 */
export async function closeSession(): Promise<ApiResponse<SessionCloseResponse>> {
	try {
		return await apiFetch<SessionCloseResponse>(apiConfig.endpoints.sessionClose, {
			method: 'POST'
		})
	} catch (error) {
		throw handleError(error, {
			context: { action: 'closeSession' }
		})
	}
}

/**
 * Get supported conversion formats
 *
 * @returns Supported formats response
 */
export async function getSupportedFormats(): Promise<ApiResponse<FormatsResponse>> {
	try {
		return await apiFetch<FormatsResponse>(apiConfig.endpoints.formats, {
			method: 'GET'
		})
	} catch (error) {
		throw handleError(error, {
			context: { action: 'getSupportedFormats' }
		})
	}
}

/**
 * Get a download URL from a download token
 *
 * @param token - Download token
 * @returns Download URL
 */
export function getDownloadUrl(token: string): string {
	return `${API_BASE_URL}${apiConfig.endpoints.download}?token=${encodeURIComponent(token)}`
}

// Export the API client as a single object
export const apiClient = {
	initSession,
	uploadFile,
	convertFile,
	getJobStatus,
	getDownloadToken,
	closeSession,
	getSupportedFormats,
	getDownloadUrl
}

export default apiClient

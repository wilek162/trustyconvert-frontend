/**
 * API client for TrustyConvert backend
 *
 * Provides type-safe API endpoints with centralized error handling,
 * CSRF protection, and consistent request/response patterns.
 */

import { getCsrfHeaders, getCsrfTokenFromCookie, dispatchCsrfError } from '@/lib/utils/csrfUtils'
import type {
	ApiResponse,
	ApiErrorInfo,
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
		return response
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') {
			throw new NetworkError({
				message: 'Request timed out',
				context: { url, timeout }
			})
		}
		throw error
	} finally {
		clearTimeout(timeoutId)
	}
}

/**
 * Process API response and handle common error patterns
 *
 * @param response - Fetch response object
 * @param endpoint - API endpoint for context
 * @returns Typed API response
 */
async function processApiResponse<T>(
	response: Response,
	endpoint: string
): Promise<ApiResponse<T>> {
	// Check for CSRF errors first
	if (response.status === 403) {
		let responseBody
		try {
			// Try to parse as JSON first
			responseBody = await response.json()
		} catch (e) {
			// If not JSON, get as text
			const responseText = await response.text()
			responseBody = { error: 'unknown', message: responseText }
		}

		// Check if this is a CSRF error
		if (
			responseBody.error === 'CSRFValidationError' ||
			(typeof responseBody.message === 'string' &&
				(responseBody.message.includes('CSRF') || responseBody.message.includes('csrf')))
		) {
			debugError('CSRF validation failed', {
				endpoint,
				status: response.status,
				error: responseBody
			})

			// Dispatch CSRF error event for the UI to handle
			dispatchCsrfError()

			// Return the error response instead of throwing
			// This allows the caller to handle it appropriately
			return {
				success: false,
				error: responseBody.error || 'CSRFValidationError',
				message: responseBody.message || 'CSRF validation failed',
				correlation_id: responseBody.correlation_id || 'unknown'
			} as unknown as ApiResponse<T>
		}
	}

	// Check for session errors
	if (response.status === 401) {
		debugError('Session validation failed', { endpoint, status: response.status })
		throw new SessionError({
			message: 'Session validation failed',
			context: { endpoint, status: response.status }
		})
	}

	// Handle successful responses
	if (response.ok) {
		try {
			const contentType = response.headers.get('content-type')
			if (contentType && contentType.includes('application/json')) {
				const jsonResponse = await response.json()
				return jsonResponse as ApiResponse<T>
			} else {
				// For non-JSON responses, return a generic success response
				return {
					success: true,
					data: {} as T & ApiErrorInfo,
					correlation_id: response.headers.get('x-correlation-id') || 'unknown'
				}
			}
		} catch (error) {
			debugError('Failed to parse API response', { endpoint, error })
			throw new NetworkError({
				message: 'Failed to parse API response',
				context: { endpoint, status: response.status }
			})
		}
	}

	// Handle error responses
	try {
		const contentType = response.headers.get('content-type')
		if (contentType && contentType.includes('application/json')) {
			const errorResponse = await response.json()
			return errorResponse as ApiResponse<T>
		} else {
			const errorText = await response.text()
			throw new NetworkError({
				message: `API Error: ${errorText}`,
				context: { endpoint, status: response.status }
			})
		}
	} catch (error) {
		if (error instanceof NetworkError) {
			throw error
		}
		throw new NetworkError({
			message: 'Failed to parse API error response',
			context: { endpoint, status: response.status }
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
	const method = options.method || 'GET'

	// Add CSRF token header if not explicitly skipped and not a GET request
	if (!options.skipCsrfCheck && method !== 'GET') {
		const headers = new Headers(options.headers || {})
		const csrfToken = getCsrfTokenFromCookie()

		// Add CSRF token header if available
		if (csrfToken) {
			headers.set(apiConfig.csrfTokenHeader, csrfToken)
			debugLog(`Adding CSRF token to ${method} request for ${endpoint}`)
		} else {
			debugError(
				`No CSRF token available for ${method} ${endpoint} request - this will likely fail`
			)
		}

		options.headers = headers
	}

	// Always include credentials for cookies
	options.credentials = 'include'

	// For development with self-signed certificates
	if (apiConfig.isDevelopment && typeof window !== 'undefined') {
		debugLog('Development mode: Using self-signed certificate and handling CORS')
	}

	debugLog(`API Request: ${method} ${endpoint}`)
	const response = await fetchWithTimeout(url, options)
	return processApiResponse<T>(response, endpoint)
}

/**
 * Initialize a session with the API
 * This will create a new session and set the necessary cookies
 *
 * @returns Session initialization response
 */
export async function initSession(): Promise<ApiResponse<SessionInitResponse>> {
	return withRetry(
		async () => {
			// Session initialization doesn't need CSRF token
			return makeRequest<SessionInitResponse>(apiConfig.endpoints.sessionInit, {
				method: 'GET',
				skipCsrfCheck: true
			})
		},
		{
			...RETRY_STRATEGIES.API_REQUEST
		}
	)
}

/**
 * Upload a file to the server
 *
 * @param file - File to upload
 * @param jobId - Optional job ID for tracking
 * @returns Upload response
 */
export async function uploadFile(file: File, jobId?: string): Promise<ApiResponse<UploadResponse>> {
	return withRetry(
		async () => {
			// Create form data with file and job ID
			const formData = new FormData()
			formData.append('file', file)
			if (jobId) {
				formData.append('job_id', jobId)
			}

			// Get CSRF token
			const csrfToken = getCsrfTokenFromCookie()
			if (!csrfToken) {
				debugError('No CSRF token available for upload request')
			}

			// Create headers with CSRF token
			const headers = new Headers()
			if (csrfToken) {
				headers.set(apiConfig.csrfTokenHeader, csrfToken)
				debugLog('Added CSRF token to upload request')
			}

			return makeRequest<UploadResponse>(apiConfig.endpoints.upload, {
				method: 'POST',
				headers,
				body: formData
			})
		},
		{
			...RETRY_STRATEGIES.API_REQUEST
		}
	)
}

/**
 * Start a file conversion
 *
 * @param jobId - Job ID of the uploaded file
 * @param targetFormat - Target format for conversion
 * @param sourceFormat - Optional source format (auto-detected if not provided)
 * @returns Conversion response
 */
export async function convertFile(
	jobId: string,
	targetFormat: string,
	sourceFormat?: string
): Promise<ApiResponse<ConvertResponse>> {
	return withRetry(
		async () => {
			// Create request body
			const body = {
				job_id: jobId,
				target_format: targetFormat,
				source_format: sourceFormat
			}

			return makeRequest<ConvertResponse>(apiConfig.endpoints.convert, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(body)
			})
		},
		{
			...RETRY_STRATEGIES.API_REQUEST
		}
	)
}

/**
 * Get the status of a conversion job
 *
 * @param jobId - Job ID to check
 * @returns Job status response
 */
export async function getJobStatus(jobId: string): Promise<ApiResponse<JobStatusResponse>> {
	return withRetry(
		async () => {
			// Add job ID as query parameter
			const endpoint = `${apiConfig.endpoints.jobStatus}?job_id=${encodeURIComponent(jobId)}`
			return makeRequest<JobStatusResponse>(endpoint, {
				method: 'GET'
			})
		},
		{
			...RETRY_STRATEGIES.API_REQUEST
		}
	)
}

/**
 * Get a download token for a completed conversion
 *
 * @param jobId - Job ID to get download token for
 * @returns Download token response
 */
export async function getDownloadToken(jobId: string): Promise<ApiResponse<DownloadTokenResponse>> {
	return withRetry(
		async () => {
			// Create request body
			const body = {
				job_id: jobId
			}

			return makeRequest<DownloadTokenResponse>(apiConfig.endpoints.downloadToken, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(body)
			})
		},
		{
			...RETRY_STRATEGIES.API_REQUEST
		}
	)
}

/**
 * Close the current session
 *
 * @returns Session close response
 */
export async function closeSession(): Promise<ApiResponse<SessionCloseResponse>> {
	return withRetry(
		async () => {
			return makeRequest<SessionCloseResponse>(apiConfig.endpoints.sessionClose, {
				method: 'POST'
			})
		},
		{
			...RETRY_STRATEGIES.API_REQUEST
		}
	)
}

/**
 * Get supported file formats
 *
 * @returns Formats response
 */
export async function getSupportedFormats(): Promise<ApiResponse<FormatsResponse>> {
	return withRetry(
		async () => {
			return makeRequest<FormatsResponse>(apiConfig.endpoints.formats, {
				method: 'GET',
				// Skip CSRF check for this public endpoint
				skipCsrfCheck: true
			})
		},
		{
			...RETRY_STRATEGIES.API_REQUEST
		}
	)
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

/**
 * API client for TrustyConvert backend
 *
 * Provides type-safe API endpoints with centralized error handling,
 * CSRF protection, and consistent request/response patterns.
 */

import { getCsrfHeaders, dispatchCsrfError } from '@/lib/utils/csrfUtils'
import sessionManager from '@/lib/services/sessionManager'
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
 * Get CSRF headers for requests that require CSRF protection
 * @returns Object with CSRF headers
 */
function getCsrfRequestHeaders(): Record<string, string> {
	const csrfToken = sessionManager.getCsrfToken()
	if (!csrfToken) {
		debugError('No CSRF token available for request headers')
		return {}
	}

	// Only include one version of the header - use the capitalized version
	// as it's more standard, but some servers might expect lowercase
	const headerName = apiConfig.csrfTokenHeader || 'X-CSRF-Token'

	// Return a single header with the proper name
	return {
		[headerName]: csrfToken
	}
}

/**
 * Make an API request with proper error handling and CSRF protection
 *
 * @param endpoint - API endpoint to call
 * @param options - Request options
 * @returns Typed API response
 */
async function makeRequest<T>(
	endpoint: string,
	options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
	const { skipAuthCheck = false, skipCsrfCheck = false, ...fetchOptions } = options
	const url = `${API_BASE_URL}${endpoint}`

	try {
		// Add CSRF headers for non-GET requests if not explicitly skipped
		if (!skipCsrfCheck && fetchOptions.method && fetchOptions.method !== 'GET') {
			const csrfHeaders = getCsrfRequestHeaders()

			// Create headers object if it doesn't exist
			const headers = new Headers(fetchOptions.headers || {})

			// Add CSRF header - ensure we don't add duplicate headers
			if (csrfHeaders[apiConfig.csrfTokenHeader]) {
				headers.set(apiConfig.csrfTokenHeader, csrfHeaders[apiConfig.csrfTokenHeader])
				debugLog(`Added CSRF token to ${fetchOptions.method} request for ${endpoint}`)
			}

			// Update the fetchOptions with our headers
			fetchOptions.headers = headers
		}

		// Always include credentials for cookies
		fetchOptions.credentials = 'include'

		// Make the request
		const response = await fetchWithTimeout(url, fetchOptions)
		return await processApiResponse<T>(response, endpoint)
	} catch (error) {
		// Handle network errors
		if (error instanceof NetworkError) {
			throw error
		}

		// Handle other errors
		throw new NetworkError({
			message: error instanceof Error ? error.message : 'Unknown error',
			context: { endpoint }
		})
	}
}

/**
 * Initialize a session with the API
 * @returns Session initialization response
 */
export async function initSession(): Promise<ApiResponse<SessionInitResponse>> {
	try {
		debugLog('API: Initializing session')
		const response = await makeRequest<SessionInitResponse>(apiConfig.endpoints.sessionInit, {
			method: 'GET',
			skipAuthCheck: true,
			skipCsrfCheck: true
		})

		// After successful session init, synchronize the token from cookie
		if (response.success && response.data?.csrf_token) {
			// We don't need to do anything here as the session manager will handle this
			debugLog('API: Session initialized with CSRF token:', response.data.csrf_token)
		}

		return response
	} catch (error) {
		debugError('API: Session initialization failed', error)
		return {
			success: false,
			data: {
				error: 'NetworkError',
				message: 'Failed to initialize session'
			} as any
		}
	}
}

/**
 * Upload a file to the server
 * @param file File to upload
 * @param jobId Job ID for tracking
 * @returns Upload response
 */
export async function uploadFile(file: File, jobId?: string): Promise<ApiResponse<UploadResponse>> {
	try {
		// Ensure we have a CSRF token
		const csrfToken = sessionManager.getCsrfToken()
		if (!csrfToken) {
			debugError('API: No CSRF token available for upload')
			return {
				success: false,
				data: {
					error: 'CSRFValidationError',
					message: 'Missing CSRF token for upload'
				} as any
			}
		}

		// Create form data
		const formData = new FormData()
		formData.append('file', file)
		if (jobId) {
			formData.append('job_id', jobId)
		}

		// Make the request
		debugLog('API: Uploading file', { fileName: file.name, fileSize: file.size, jobId })
		const response = await makeRequest<UploadResponse>(apiConfig.endpoints.upload, {
			method: 'POST',
			body: formData
		})

		return response
	} catch (error) {
		debugError('API: File upload failed', error)
		return {
			success: false,
			data: {
				error: 'NetworkError',
				message: 'Failed to upload file'
			} as any
		}
	}
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

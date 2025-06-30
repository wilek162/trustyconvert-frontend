/**
 * CORE API client for TrustyConvert backend
 *
 * Provides type-safe API endpoints with centralized error handling,
 * CSRF protection, and consistent request/response patterns.
 * Never use this file directly, use the client.ts file instead or sessionManger.ts for session management.
 */

import { dispatchCsrfError } from '@/lib/utils/csrfUtils'
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
import {
	NetworkError,
	SessionError,
	ValidationError,
	handleError,
	getErrorMessageTemplate
} from '@/lib/utils/errorHandling'
import { apiConfig } from './config'
import { withRetry, RETRY_STRATEGIES, isRetryableError } from '@/lib/utils/retry'
import { debugLog, debugError } from '@/lib/utils/debug'
import { formatMessage } from '@/lib/utils/messageUtils'

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
			const headers = new Headers(fetchOptions.headers || {})
			headers.set('Origin', window.location.origin)
			fetchOpts.headers = headers
		}

		const response = await fetch(url, fetchOpts)
		return response
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') {
			throw new NetworkError('Request timed out', { url, timeout })
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
		throw new SessionError('Session validation failed', { endpoint, status: response.status })
	}

	// Handle successful responses
	if (response.ok) {
		try {
			const contentType = response.headers.get('content-type')
			if (contentType && contentType.includes('application/json')) {
				const jsonResponse = await response.json()

				// Check if response contains a new CSRF token and update it in the store
				if (jsonResponse.data && jsonResponse.data.csrf_token) {
					debugLog('Received new CSRF token from server response')
					sessionManager.updateCsrfTokenFromServer(jsonResponse.data.csrf_token)
				}

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
			throw new NetworkError('Failed to parse API response', { endpoint, status: response.status })
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
			throw new NetworkError(`API Error: ${errorText}`, { endpoint, status: response.status })
		}
	} catch (error) {
		if (error instanceof NetworkError) {
			throw error
		}
		throw new NetworkError('Failed to parse API error response', {
			endpoint,
			status: response.status
		})
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
			// First try to synchronize token from cookie to memory
			sessionManager.synchronizeTokenFromCookie()

			const csrfHeaders = sessionManager.getCsrfHeaders()

			// Create headers object if it doesn't exist
			const headers = new Headers(fetchOptions.headers || {})

			// Add CSRF header if available
			if (Object.keys(csrfHeaders).length > 0) {
				for (const [key, value] of Object.entries(csrfHeaders)) {
					headers.set(key, value)
				}
				debugLog(`Added CSRF token to ${fetchOptions.method} request for ${endpoint}`)
			} else {
				debugLog(`No CSRF token available for ${fetchOptions.method} request to ${endpoint}`)
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
		throw new NetworkError('Unknown error during API request', { endpoint })
	}
}

/**
 * Initialize a session with the backend
 *
 * @returns Session initialization response or null on error
 */
async function initSession(): Promise<SessionInitResponse | null> {
	debugLog('API: Initializing session')

	try {
		// Make the session initialization request
		const response = await makeRequest<SessionInitResponse>(apiConfig.endpoints.sessionInit, {
			method: 'GET',
			skipCsrfCheck: true // Skip CSRF check for initial session creation
		})

		// Check if the response was successful
		if (!response.success) {
			debugError('Session initialization failed', {
				error: response.data?.error || 'Unknown error',
				message: response.data?.message || response.data?.error_message || 'No message provided',
				correlationId: response.correlation_id || 'no-correlation-id'
			})
			return null
		}

		// Return the session data
		return response.data
	} catch (error) {
		// Log detailed error information in development mode
		if (import.meta.env.DEV) {
			console.group('Session Initialization API Error')
			console.error('Error details:', error)

			// Try to get more information about the error
			if (error instanceof NetworkError) {
				console.log('Network error context:', error.context)
			}

			// Check if the API is reachable
			try {
				const healthCheck = await fetch(`${API_BASE_URL}/health`, {
					method: 'GET',
					mode: 'cors',
					credentials: 'include'
				})
				console.log(
					'API health check status:',
					healthCheck.status,
					healthCheck.ok ? 'OK' : 'Failed'
				)
			} catch (healthError) {
				console.error('API health check failed:', healthError)
			}

			console.groupEnd()
		}

		debugError('Failed to initialize session', error)
		return null
	}
}

/**
 * Upload a file to the server
 * @param file File to upload
 * @param jobId Job ID for tracking
 * @returns Upload response
 */
async function uploadFile(file: File, jobId?: string): Promise<ApiResponse<UploadResponse>> {
	try {
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

		// Use centralized error handling
		handleError(error, {
			context: {
				component: 'apiClient',
				action: 'uploadFile',
				fileName: file.name,
				fileSize: file.size,
				jobId
			},
			showToast: true
		})

		return {
			success: false,
			data: {
				error: 'NetworkError',
				message: getErrorMessageTemplate(error)
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
async function convertFile(
	jobId: string,
	targetFormat: string,
	sourceFormat?: string
): Promise<ApiResponse<ConvertResponse>> {
	const retryConfig = {
		...RETRY_STRATEGIES.API_REQUEST
	}

	return withRetry(async () => {
		// Create request body
		const body = {
			job_id: jobId,
			target_format: targetFormat,
			source_format: sourceFormat
		}

		try {
			return await makeRequest<ConvertResponse>(apiConfig.endpoints.convert, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(body)
			})
		} catch (error) {
			// Handle error before retrying
			debugError('API: Convert file failed', { error, jobId, targetFormat })

			// Let the retry mechanism handle it
			throw error
		}
	}, retryConfig).catch((error) => {
		// Final error handling after all retries
		handleError(error, {
			context: {
				component: 'apiClient',
				action: 'convertFile',
				jobId,
				targetFormat,
				sourceFormat
			},
			showToast: true
		})

		// Return error response
		return {
			success: false,
			data: {
				error: error instanceof Error ? error.name : 'ConversionError',
				message: getErrorMessageTemplate(error)
			} as any
		}
	})
}

/**
 * Get the status of a conversion job
 *
 * @param jobId - Job ID to check
 * @returns Job status response
 */
async function getJobStatus(jobId: string): Promise<ApiResponse<JobStatusResponse>> {
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
async function getDownloadToken(jobId: string): Promise<ApiResponse<DownloadTokenResponse>> {
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
async function closeSession(): Promise<ApiResponse<SessionCloseResponse>> {
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
async function getSupportedFormats(): Promise<ApiResponse<FormatsResponse>> {
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
function getDownloadUrl(token: string): string {
	// Ensure the token is properly encoded
	const encodedToken = encodeURIComponent(token)
	return `${API_BASE_URL}${apiConfig.endpoints.download}?token=${encodedToken}`
}

// Export the API client as a single object
export const _apiClient = {
	initSession,
	uploadFile,
	convertFile,
	getJobStatus,
	getDownloadToken,
	closeSession,
	getSupportedFormats,
	getDownloadUrl
}

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
	SessionInitResponse,
	UploadResponse,
	JobStatusResponse,
	DownloadTokenResponse,
	ConvertResponse,
	SessionCloseResponse,
	FormatsResponse
} from '@/lib/types/api'
import {
	ApiError,
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
	// Calculate timeout based on file size if it's an upload request
	let { timeout = DEFAULT_TIMEOUT } = options

	// For file uploads, adjust timeout based on file size
	if (options.body instanceof FormData && options.method === 'POST') {
		const formData = options.body as FormData
		const fileField = formData.get('file')

		if (fileField instanceof File) {
			const fileSize = fileField.size
			// Calculate adaptive timeout: base + additional time based on file size
			// 30s base + 1s per MB with a reasonable maximum
			const fileSizeInMB = fileSize / (1024 * 1024)
			const adaptiveTimeout = Math.min(
				DEFAULT_TIMEOUT + fileSizeInMB * 1000,
				5 * 60 * 1000 // Cap at 5 minutes
			)

			// Use the larger of default or adaptive timeout
			timeout = Math.max(timeout, adaptiveTimeout)

			if (timeout > DEFAULT_TIMEOUT) {
				debugLog(`Increased timeout to ${timeout}ms for ${fileSize} byte file upload`)
			}
		}
	}

	const { ...fetchOptions } = options

	// Create abort controller for timeout
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), timeout)

	try {
		// Detect environment
		const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development'
		const isBrowser = typeof window !== 'undefined'

		// Create fetch options with proper signal
		const fetchOpts = {
			...fetchOptions,
			signal: controller.signal
		}

		// Always include credentials for session cookies
		fetchOpts.credentials = 'include'

		// Always set Origin header if in browser (for CORS in prod & dev)
		if (isBrowser) {
			const headers = new Headers(fetchOptions.headers || {})
			headers.set('Origin', window.location.origin)
			headers.set('Accept', 'application/json')
			fetchOpts.headers = headers
		}

		// In development, log request details
		if (isDev && isBrowser) {
			console.group('API Request Details')
			console.log('URL:', url)
			console.log('Method:', fetchOptions.method || 'GET')
			console.log('Headers:', Object.fromEntries([...new Headers(fetchOpts.headers).entries()]))
			console.log('Credentials:', fetchOpts.credentials)
			console.log('Mode:', fetchOpts.mode)
			if (options.body instanceof FormData) {
				const formData = options.body as FormData
				const fileField = formData.get('file')
				if (fileField instanceof File) {
					console.log('File size:', formatFileSize(fileField.size))
					console.log('Timeout:', timeout)
				}
			}
			console.groupEnd()
		}

		const response = await fetch(url, fetchOpts)

		// In development, log response details
		if (isDev && isBrowser) {
			console.group('API Response Details')
			console.log('URL:', url)
			console.log('Status:', response.status)
			console.log('OK:', response.ok)
			console.log('Status Text:', response.statusText)

			const headerEntries: string[] = []
			response.headers.forEach((value, key) => {
				headerEntries.push(`${key}: ${value}`)
			})
			console.log('Headers:', headerEntries)
			console.groupEnd()
		}

		return response
	} catch (error) {
		if (error instanceof DOMException && error.name === 'AbortError') {
			// Provide more context for timeout errors
			const timeoutError = new NetworkError(
				options.body instanceof FormData && options.method === 'POST'
					? 'Upload request timed out. This may be due to the file size being too large or network issues.'
					: 'Request timed out',
				{ url, timeout }
			)

			// Add more context to the error
			if (options.body instanceof FormData) {
				const formData = options.body as FormData
				const fileField = formData.get('file')
				if (fileField instanceof File) {
					timeoutError.context = {
						...timeoutError.context,
						fileSize: fileField.size,
						fileName: fileField.name
					}
				}
			}

			throw timeoutError
		}

		// Enhanced error logging in development
		if (import.meta.env.DEV) {
			console.group('API Request Error')
			console.error('Error details:', error)
			console.log('URL:', url)
			console.log('Method:', fetchOptions.method || 'GET')

			// Check for CORS errors
			if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
				console.warn('This appears to be a CORS error. Check that:')
				console.log('1. The API server is running and accessible')
				console.log('2. CORS is properly configured on the API server')
				console.log('3. The API server allows requests from:', window.location.origin)
				console.log('4. If using HTTPS locally, certificates are properly set up')
			}

			console.groupEnd()
		}

		throw error
	} finally {
		clearTimeout(timeoutId)
	}
}

// Helper function to format file size for logging
function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 Bytes'
	const k = 1024
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Process API response and handle common error patterns
 *
 * @param response - Fetch response object
 * @param endpoint - API endpoint for context
 * @returns Typed API response
 */
async function processApiResponse<T>(response: Response, endpoint: string): Promise<T> {
	// Change return type to T, as errors will be thrown
	// Check for CSRF errors first
	if (response.status === 403) {
		let responseBody
		try {
			responseBody = await response.json()
		} catch (e) {
			const responseText = await response.text()
			responseBody = { error: 'unknown', message: responseText }
		}

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
			dispatchCsrfError()
			throw new ApiError(
				responseBody.message || 'CSRF validation failed',
				response.status,
				responseBody.error || 'CSRFValidationError',
				responseBody.correlation_id || 'unknown'
			)
		}
	}

	// Check for session errors
	if (response.status === 401) {
		debugError('Session validation failed', { endpoint, status: response.status })
		throw new SessionError('Session validation failed', { endpoint, status: response.status })
	}

	// Check for CSRF token in response headers (keep this logic as it updates sessionManager)
	const csrfHeaderName = apiConfig.csrfTokenHeader || 'X-CSRF-Token'
	let csrfToken = response.headers.get(csrfHeaderName)

	if (!csrfToken) {
		const setCookieHeader = response.headers.get('set-cookie')
		if (setCookieHeader) {
			if (import.meta.env.DEV) {
				console.log('Set-Cookie header found:', setCookieHeader)
			}
			const csrfCookieMatch = setCookieHeader.match(/csrftoken=([^;]+)/)
			if (csrfCookieMatch && csrfCookieMatch[1]) {
				csrfToken = csrfCookieMatch[1]
				debugLog('Found CSRF token in Set-Cookie header')
			}
		}
	}

	if (!csrfToken && endpoint.includes('session/init')) {
		try {
			const clonedResponse = response.clone()
			const jsonBody = await clonedResponse.json()

			if (import.meta.env.DEV) {
				console.group('Session Init Response Body')
				console.log('Full response body:', jsonBody)
				console.groupEnd()
			}

			if (jsonBody) {
				if (jsonBody.csrf_token) {
					csrfToken = jsonBody.csrf_token
					debugLog('Found CSRF token in response body (root.csrf_token)')
				} else if (jsonBody.data && jsonBody.data.csrf_token) {
					csrfToken = jsonBody.data.csrf_token
					debugLog('Found CSRF token in response body (data.csrf_token)')
				} else if (jsonBody.data && jsonBody.data.id) {
					csrfToken = jsonBody.data.id
					debugLog('Using session ID as CSRF token (data.id)')
				} else if (jsonBody.token) {
					csrfToken = jsonBody.token
					debugLog('Found CSRF token in response body (root.token)')
				} else if (jsonBody.data && jsonBody.data.token) {
					csrfToken = jsonBody.data.token
					debugLog('Found CSRF token in response body (data.token)')
				} else if (jsonBody.session_id) {
					csrfToken = jsonBody.session_id
					debugLog('Using session_id as CSRF token (root.session_id)')
				} else if (jsonBody.data && jsonBody.data.session_id) {
					csrfToken = jsonBody.data.session_id
					debugLog('Using session_id as CSRF token (data.session_id)')
				}
			}
		} catch (e) {
			debugError('Error checking for CSRF token in response body:', e)
		}
	}

	if (!csrfToken && typeof document !== 'undefined') {
		const cookies = document.cookie.split(';')
		const csrfCookieNames = apiConfig.csrfCookieNames || ['csrftoken', 'csrf_token']

		if (import.meta.env.DEV) {
			console.group('Cookies available during API response processing')
			console.log('All cookies:', document.cookie)
			cookies.forEach((cookie) => {
				const [name, value] = cookie.trim().split('=')
				console.log(`Cookie: ${name} = ${value ? value.substring(0, 10) + '...' : 'empty'}`)
			})
			console.groupEnd()
		}

		for (const cookie of cookies) {
			const [name, value] = cookie.trim().split('=')
			if (csrfCookieNames.includes(name) && value) {
				csrfToken = value
				debugLog(`Found CSRF token in cookies (${name})`)
				break
			}
		}
	}

	if (import.meta.env.DEV) {
		console.group('Response Headers')
		console.log('Endpoint:', endpoint)
		console.log('Status:', response.status)
		console.log('Looking for CSRF header:', csrfHeaderName)

		const headerEntries: string[] = []
		response.headers.forEach((value, key) => {
			headerEntries.push(`${key}: ${value}`)
		})
		console.log('All headers:', headerEntries)
		console.groupEnd()
	}

	if (csrfToken) {
		debugLog(`Received CSRF token: ${csrfToken.substring(0, 5)}...`)

		if (import.meta.env.DEV) {
			console.group('CSRF Token Found')
			console.log('CSRF token:', `${csrfToken.substring(0, 5)}...`)
			console.log('Current token in store:', sessionManager.getCsrfToken() ? 'exists' : 'none')
			console.groupEnd()
		}

		sessionManager.updateCsrfTokenFromServer(csrfToken)

		if (import.meta.env.DEV) {
			console.log('CSRF token update success:', sessionManager.getCsrfToken() ? 'true' : 'false')
			console.log('Token after update:', sessionManager.getCsrfToken() ? 'exists' : 'none')
		}
	} else {
		if (endpoint.includes('session')) {
			debugError(`No CSRF token found in response headers for ${endpoint}`)
			if (import.meta.env.DEV) {
				console.warn(`No CSRF token found in response headers for ${endpoint}`)
			}
		}
	}

	// Handle successful responses
	if (response.ok) {
		try {
			const contentType = response.headers.get('content-type')
			if (contentType && contentType.includes('application/json')) {
				const jsonResponse = await response.json()

				if (endpoint.includes('session') && !csrfToken) {
					let tokenFromBody = null
					if (jsonResponse.data && jsonResponse.data.csrf_token) {
						tokenFromBody = jsonResponse.data.csrf_token
						debugLog('Found CSRF token in JSON response body (data.csrf_token)')
					} else if (jsonResponse.csrf_token) {
						tokenFromBody = jsonResponse.csrf_token
						debugLog('Found CSRF token in JSON response body (root.csrf_token)')
					} else if (jsonResponse.data && jsonResponse.data.token) {
						tokenFromBody = jsonResponse.data.token
						debugLog('Found CSRF token in JSON response body (data.token)')
					} else if (jsonResponse.token) {
						tokenFromBody = jsonResponse.token
						debugLog('Found CSRF token in JSON response body (root.token)')
					} else if (jsonResponse.data && jsonResponse.data.id) {
						tokenFromBody = jsonResponse.data.id
						debugLog('Using session ID as CSRF token from response body')
					}

					if (tokenFromBody) {
						sessionManager.updateCsrfTokenFromServer(tokenFromBody)
					}
				}

				return jsonResponse as T // Return the data directly
			} else {
				// For non-JSON responses, if successful, return empty object or specific type if needed
				return {} as T
			}
		} catch (error) {
			debugError('Failed to parse successful API response as JSON', { endpoint, error })
			throw new NetworkError('Failed to parse successful API response', {
				endpoint,
				status: response.status
			})
		}
	} else {
		// Handle error responses (response.ok is false)
		try {
			const contentType = response.headers.get('content-type')
			if (contentType && contentType.includes('application/json')) {
				const errorResponse = await response.json()
				throw new ApiError(
					errorResponse.message || 'API error',
					response.status,
					errorResponse.error || 'UnknownApiError',
					errorResponse.correlation_id || 'unknown'
				)
			} else {
				const errorText = await response.text()
				throw new NetworkError(`API Error: ${errorText}`, { endpoint, status: response.status })
			}
		} catch (error) {
			if (
				error instanceof ApiError ||
				error instanceof NetworkError ||
				error instanceof SessionError
			) {
				throw error // Re-throw already classified errors
			}
			throw new NetworkError('Failed to parse API error response or unknown error', {
				endpoint,
				status: response.status,
				originalError: error // Include original error for debugging
			})
		}
	}
}

/**
 * Make an API request with proper error handling and CSRF protection
 *
 * @param endpoint - API endpoint to call
 * @param options - Request options
 * @returns Typed API response
 */
async function makeRequest<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
	// Change return type
	const { skipAuthCheck = false, skipCsrfCheck = false, ...fetchOptions } = options
	const url = `${API_BASE_URL}${endpoint}`

	// Add CSRF headers for non-GET requests if not explicitly skipped
	if (!skipCsrfCheck && fetchOptions.method && fetchOptions.method !== 'GET') {
		const csrfHeaders = sessionManager.getCsrfHeaders()
		const headers = new Headers(fetchOptions.headers || {})

		if (Object.keys(csrfHeaders).length > 0) {
			for (const [key, value] of Object.entries(csrfHeaders)) {
				headers.set(key, value)
			}
			debugLog(`Added CSRF token to ${fetchOptions.method} request for ${endpoint}`)
		} else {
			debugLog(`No CSRF token available for ${fetchOptions.method} request to ${endpoint}`)
		}
		fetchOptions.headers = headers
	}

	fetchOptions.credentials = 'include'

	const response = await fetchWithTimeout(url, fetchOptions)
	return await processApiResponse<T>(response, endpoint) // processApiResponse now throws errors
}

/**
 * Make a session initialization request
 * This is a low-level function that just makes the HTTP request
 * Session state management should be handled by the client
 */
async function initSession(): Promise<SessionInitResponse> {
	const response = await withRetry(
		async () => {
			return makeRequest<SessionInitResponse>(apiConfig.endpoints.sessionInit, {
				method: 'GET',
				skipCsrfCheck: true,
				credentials: 'include',
				headers: {
					...(import.meta.env.DEV && typeof window !== 'undefined'
						? { Origin: window.location.origin }
						: {}),
					Accept: 'application/json'
				}
			})
		},
		{
			...RETRY_STRATEGIES.API_REQUEST,
			onExhausted: (error, attempts) => {
				handleError(error, {
					showToast: true,
					context: {
						message: `Session initialization failed after ${attempts} attempts.`,
						errorType: error instanceof Error ? error.name : 'UnknownError'
					}
				})
			}
		}
	)

	// After the response is received, the browser might have already set the cookie
	// Check for CSRF token in cookies immediately
	if (typeof document !== 'undefined') {
		const cookies = document.cookie.split(';')
		const csrfCookieNames = apiConfig.csrfCookieNames || ['csrftoken', 'csrf_token']

		if (import.meta.env.DEV) {
			console.group('Cookies after session init response')
			console.log('All cookies:', document.cookie)
			cookies.forEach((cookie) => {
				const [name, value] = cookie.trim().split('=')
				console.log(`Cookie: ${name} = ${value ? value.substring(0, 10) + '...' : 'empty'}`)
			})
			console.groupEnd()
		}

		for (const cookie of cookies) {
			const [name, value] = cookie.trim().split('=')
			if (csrfCookieNames.includes(name) && value) {
				debugLog(`Found CSRF token in cookies after session init (${name})`)
				sessionManager.updateCsrfTokenFromServer(value)
				break
			}
		}
	}

	return response
}

/**
 * Upload a file to the server
 * @param file File to upload
 * @param jobId Job ID for tracking
 * @returns Upload response
 */
async function uploadFile(file: File, jobId?: string): Promise<UploadResponse> {
	// Create form data
	const formData = new FormData()
	formData.append('file', file)
	if (jobId) {
		formData.append('job_id', jobId)
	}

	// Add file size hint to help server prepare for large files
	formData.append('file_size', file.size.toString())

	// Make the request with adaptive timeout based on file size
	// The timeout will be calculated in fetchWithTimeout based on file size
	debugLog('API: Uploading file', { fileName: file.name, fileSize: file.size, jobId })

	// For large files, use a more robust retry strategy
	const isLargeFile = file.size > 20 * 1024 * 1024 // 20MB
	const retryStrategy = isLargeFile
		? {
				...RETRY_STRATEGIES.CRITICAL,
				maxRetries: 2, // Limit retries for large files to avoid timeouts
				initialDelay: 1000, // Longer initial delay
				onRetry: (error: unknown, attempt: number) => {
					debugLog(`Retrying large file upload (attempt ${attempt})`, {
						fileName: file.name,
						fileSize: file.size
					})
				}
			}
		: RETRY_STRATEGIES.API_REQUEST

	const response = await withRetry(
		async () =>
			makeRequest<UploadResponse>(apiConfig.endpoints.upload, {
				method: 'POST',
				body: formData
				// Let fetchWithTimeout calculate the appropriate timeout
			}),
		{
			...retryStrategy,
			onExhausted: (error, attempts) => {
				const errorContext = {
					component: 'apiClient',
					action: 'uploadFile',
					fileName: file.name,
					fileSize: file.size,
					jobId,
					attempts
				}
				// Provide more specific error messages for large files
				if (file.size > 50 * 1024 * 1024) {
					handleError(error, {
						context: errorContext,
						showToast: true
					})
				} else {
					handleError(error, {
						context: errorContext,
						showToast: true
					})
				}
			}
		}
	)

	return response
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
): Promise<ConvertResponse> {
	const retryConfig = {
		...RETRY_STRATEGIES.API_REQUEST,
		onExhausted: (error: unknown, attempts: any) => {
			handleError(error, {
				context: {
					component: 'apiClient',
					action: 'convertFile',
					jobId,
					targetFormat,
					sourceFormat,
					attempts
				},
				showToast: true
			})
		}
	}

	return withRetry(async () => {
		const body = {
			job_id: jobId,
			target_format: targetFormat,
			source_format: sourceFormat
		}

		return await makeRequest<ConvertResponse>(apiConfig.endpoints.convert, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		})
	}, retryConfig)
}

/**
 * Get the status of a conversion job
 *
 * @param jobId - Job ID to check
 * @returns Job status response
 */
async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
	return withRetry(
		async () => {
			const endpoint = `${apiConfig.endpoints.jobStatus}?job_id=${encodeURIComponent(jobId)}`
			return makeRequest<JobStatusResponse>(endpoint, {
				method: 'GET'
			})
		},
		{
			...RETRY_STRATEGIES.API_REQUEST,
			onExhausted: (error, attempts) => {
				handleError(error, {
					showToast: true,
					context: {
						message: `Failed to get job status after ${attempts} attempts.`,
						jobId,
						errorType: error instanceof Error ? error.name : 'UnknownError'
					}
				})
			}
		}
	)
}

/**
 * Get a download token for a completed conversion
 *
 * @param jobId - Job ID to get download token for
 * @returns Download token response
 */
async function getDownloadToken(jobId: string): Promise<DownloadTokenResponse> {
	return withRetry(
		async () => {
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
			...RETRY_STRATEGIES.API_REQUEST,
			onExhausted: (error, attempts) => {
				handleError(error, {
					showToast: true,
					context: {
						message: `Failed to get download token after ${attempts} attempts.`,
						jobId,
						errorType: error instanceof Error ? error.name : 'UnknownError'
					}
				})
			}
		}
	)
}

async function closeSession(): Promise<SessionCloseResponse> {
	return withRetry(
		async () => {
			return makeRequest<SessionCloseResponse>(apiConfig.endpoints.sessionClose, {
				method: 'POST'
			})
		},
		{
			...RETRY_STRATEGIES.API_REQUEST,
			onExhausted: (error, attempts) => {
				handleError(error, {
					showToast: true,
					context: {
						message: `Failed to close session after ${attempts} attempts.`,
						errorType: error instanceof Error ? error.name : 'UnknownError'
					}
				})
			}
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
	// Ensure proper URL joining with forward slash
	const baseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`
	return `${baseUrl}${apiConfig.endpoints.download}?token=${encodedToken}`
}

/**
 * Start a conversion directly (upload + convert)
 *
 * @param file - File to convert
 * @param targetFormat - Target format
 * @returns Conversion response with job_id
 */
async function startConversion(
	file: File,
	targetFormat: string
): Promise<ConvertResponse & { job_id: string }> {
	// First upload the file
	const uploadResp = await uploadFile(file)

	// Then convert the file
	const jobId = uploadResp.job_id
	const convertResp = await convertFile(jobId, targetFormat)

	// Combine the responses
	return {
		...convertResp,
		job_id: jobId
	}
}

// Export the API client as a single object
export const _apiClient = {
	makeRequest,
	initSession,
	uploadFile,
	convertFile,
	getJobStatus,
	getDownloadToken,
	closeSession,
	getDownloadUrl,
	startConversion
}

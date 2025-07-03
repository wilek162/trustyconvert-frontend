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
import { handleError } from '@/lib/errors/errorHandlingService'
import { NetworkError, SessionError, ValidationError } from '@/lib/errors/error-types'
import { apiConfig } from './config'
import { withRetry, RETRY_STRATEGIES, isRetryableError } from '@/lib/utils/retry'
import { debugLog, debugError } from '@/lib/utils/debug'
import { formatMessage, MESSAGE_TEMPLATES } from '@/lib/utils/messageUtils'

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
			
			// Add additional headers that might help with CORS
			headers.set('Accept', 'application/json')
			
			// Log request details in development
			console.group('API Request Details')
			console.log('URL:', url)
			console.log('Method:', fetchOptions.method || 'GET')
			console.log('Headers:', Object.fromEntries([...headers.entries()]))
			console.log('Credentials:', fetchOpts.credentials)
			console.log('Mode:', fetchOpts.mode)
			console.groupEnd()
			
			fetchOpts.headers = headers
		}

		// Always ensure credentials are included for session cookies
		if (!fetchOpts.credentials) {
			fetchOpts.credentials = 'include'
		}

		const response = await fetch(url, fetchOpts)
		
		// In development, log response details
		if (isDev && typeof window !== 'undefined') {
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
			throw new NetworkError('Request timed out', { url, timeout })
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

	// Check for CSRF token in response headers
	const csrfHeaderName = apiConfig.csrfTokenHeader || 'X-CSRF-Token'
	
	// Try multiple ways to get the CSRF token from headers
	let csrfToken = null
	
	csrfToken = response.headers.get(csrfHeaderName)
	
	if (!csrfToken) {
		const setCookieHeader = response.headers.get('set-cookie');
		if (setCookieHeader) {
			// Log the Set-Cookie header in development mode
			if (import.meta.env.DEV) {
				console.log('Set-Cookie header found:', setCookieHeader);
			}
			
			// Try to extract csrftoken from Set-Cookie header
			const csrfCookieMatch = setCookieHeader.match(/csrftoken=([^;]+)/);
			if (csrfCookieMatch && csrfCookieMatch[1]) {
				csrfToken = csrfCookieMatch[1];
				debugLog('Found CSRF token in Set-Cookie header');
			}
		}
	}
	
	// Method 3: Check for token in response body for session init endpoint
	if (!csrfToken && endpoint.includes('session/init')) {
		try {
			// Clone the response to avoid consuming it
			const clonedResponse = response.clone()
			const jsonBody = await clonedResponse.json()
			
			// Log the full response structure in development mode
			if (import.meta.env.DEV) {
				console.group('Session Init Response Body')
				console.log('Full response body:', jsonBody)
				console.groupEnd()
			}
			
			// Check for CSRF token in various places in the response structure
			// Try all possible paths where the CSRF token might be located
			if (jsonBody) {
				// Check direct properties
				if (jsonBody.csrf_token) {
					csrfToken = jsonBody.csrf_token;
					debugLog('Found CSRF token in response body (root.csrf_token)');
				} 
				// Check in data property
				else if (jsonBody.data && jsonBody.data.csrf_token) {
					csrfToken = jsonBody.data.csrf_token;
					debugLog('Found CSRF token in response body (data.csrf_token)');
				}
				// Check in id property (some APIs use this)
				else if (jsonBody.data && jsonBody.data.id) {
					csrfToken = jsonBody.data.id;
					debugLog('Using session ID as CSRF token (data.id)');
				}
				// Check for token property
				else if (jsonBody.token) {
					csrfToken = jsonBody.token;
					debugLog('Found CSRF token in response body (root.token)');
				}
				// Check in data property for token
				else if (jsonBody.data && jsonBody.data.token) {
					csrfToken = jsonBody.data.token;
					debugLog('Found CSRF token in response body (data.token)');
				}
				// Check for session_id as fallback
				else if (jsonBody.session_id) {
					csrfToken = jsonBody.session_id;
					debugLog('Using session_id as CSRF token (root.session_id)');
				}
				// Check for session_id in data
				else if (jsonBody.data && jsonBody.data.session_id) {
					csrfToken = jsonBody.data.session_id;
					debugLog('Using session_id as CSRF token (data.session_id)');
				}
			}
		} catch (e) {
			// Ignore errors parsing JSON
			debugError('Error checking for CSRF token in response body:', e)
		}
	}
	
	// Method 4: Check for token in cookies (if accessible)
	if (!csrfToken && typeof document !== 'undefined') {
		const cookies = document.cookie.split(';')
		const csrfCookieNames = apiConfig.csrfCookieNames || ['csrftoken', 'csrf_token']
		
		// Log all cookies in development mode
		if (import.meta.env.DEV) {
			console.group('Cookies available during API response processing');
			console.log('All cookies:', document.cookie);
			cookies.forEach(cookie => {
				const [name, value] = cookie.trim().split('=');
				console.log(`Cookie: ${name} = ${value ? value.substring(0, 10) + '...' : 'empty'}`);
			});
			console.groupEnd();
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
	
	// Log all headers in development mode to help with debugging
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
		
		// Log the token for debugging
		if (import.meta.env.DEV) {
			console.group('CSRF Token Found')
			console.log('CSRF token:', `${csrfToken.substring(0, 5)}...`)
			console.log('Current token in store:', sessionManager.getCsrfToken() ? 'exists' : 'none')
			console.groupEnd()
		}
		
		// Update the token in the session manager
		const success = sessionManager.updateCsrfTokenFromServer(csrfToken)
		
		if (import.meta.env.DEV) {
			console.log('CSRF token update success:', success)
			console.log('Token after update:', sessionManager.getCsrfToken() ? 'exists' : 'none')
		}
	} else {
		// Log when no CSRF token is found in headers for session-related endpoints
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
				
				// Log the full response in development mode
				if (import.meta.env.DEV && endpoint.includes('session')) {
					console.group('Parsed JSON Response')
					console.log('Endpoint:', endpoint)
					console.log('Full response:', jsonResponse)
					console.groupEnd()
				}
				
				// Additional check for CSRF token in JSON response for session endpoints
				if (endpoint.includes('session') && !csrfToken) {
					// Try to find the CSRF token in the response
					let tokenFromBody = null;
					
					// Check various places where the token might be
					if (jsonResponse.data && jsonResponse.data.csrf_token) {
						tokenFromBody = jsonResponse.data.csrf_token;
						debugLog('Found CSRF token in JSON response body (data.csrf_token)');
					} else if (jsonResponse.csrf_token) {
						tokenFromBody = jsonResponse.csrf_token;
						debugLog('Found CSRF token in JSON response body (root.csrf_token)');
					} else if (jsonResponse.data && jsonResponse.data.token) {
						tokenFromBody = jsonResponse.data.token;
						debugLog('Found CSRF token in JSON response body (data.token)');
					} else if (jsonResponse.token) {
						tokenFromBody = jsonResponse.token;
						debugLog('Found CSRF token in JSON response body (root.token)');
					} else if (jsonResponse.data && jsonResponse.data.id) {
						// Some APIs use the session ID as the CSRF token
						tokenFromBody = jsonResponse.data.id;
						debugLog('Using session ID as CSRF token from response body');
					}
					
					if (tokenFromBody) {
						sessionManager.updateCsrfTokenFromServer(tokenFromBody);
					}
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
			// Get CSRF headers from session manager
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
 * Make a session initialization request
 * This is a low-level function that just makes the HTTP request
 * Session state management should be handled by the client
 */
async function initSession(): Promise<SessionInitResponse | null> {
	try {
		// Make the session initialization request with specific options for better CORS handling
		const response = await makeRequest<SessionInitResponse>(apiConfig.endpoints.sessionInit, {
			method: 'GET',
			skipCsrfCheck: true, // Skip CSRF check for initial session creation
			credentials: 'include', // Always include credentials for session cookies
			headers: {
				// Explicitly set origin header in development mode
				...(import.meta.env.DEV && typeof window !== 'undefined' ? { 'Origin': window.location.origin } : {}),
				// Set accept header to ensure JSON response
				'Accept': 'application/json'
			}
		})

		// Check if the response was successful
		if (!response.success) {
			// For error responses, log what we can
			debugError('Session initialization request failed', {
				correlationId: response.correlation_id || 'no-correlation-id'
			})
			return null
		}

		// After the response is received, the browser might have already set the cookie
		// Check for CSRF token in cookies immediately
		if (typeof document !== 'undefined') {
			const cookies = document.cookie.split(';')
			const csrfCookieNames = apiConfig.csrfCookieNames || ['csrftoken', 'csrf_token']
			
			if (import.meta.env.DEV) {
				console.group('Cookies after session init response')
				console.log('All cookies:', document.cookie)
				cookies.forEach(cookie => {
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

		return response.data
	} catch (error) {
		debugError('Failed to make session initialization request', error)
		throw error
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
				message: MESSAGE_TEMPLATES.generic.networkError
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
				message: MESSAGE_TEMPLATES.conversion.failed
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
async function startConversion(file: File, targetFormat: string): Promise<ApiResponse<ConvertResponse & { job_id: string }>> {
	try {
		// First upload the file
		const uploadResp = await uploadFile(file);
		
		if (!uploadResp.success || !uploadResp.data.job_id) {
			throw new Error('File upload failed');
		}
		
		// Then convert the file
		const jobId = uploadResp.data.job_id;
		const convertResp = await convertFile(jobId, targetFormat);
		
		// Combine the responses
		return {
			success: convertResp.success,
			data: {
				...convertResp.data,
				job_id: jobId
			},
			correlation_id: convertResp.correlation_id
		};
	} catch (error) {
		debugError('API: Start conversion failed', error);
		
		// Handle error
		handleError(error, {
			context: {
				component: 'apiClient',
				action: 'startConversion',
				fileName: file.name,
				fileSize: file.size,
				targetFormat
			},
			showToast: true
		});
		
		// Return error response
		return {
			success: false,
			data: {
				error: error instanceof Error ? error.name : 'ConversionError',
				message: MESSAGE_TEMPLATES.conversion.failed,
				job_id: '' // Empty job ID for error case
			} as any
		};
	}
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
	getDownloadUrl,
	startConversion
}

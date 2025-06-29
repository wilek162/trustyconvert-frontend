/**
 * CSRF Token Utilities
 *
 * Provides utilities for working with CSRF tokens, implementing the Double Submit Cookie pattern
 * for CSRF protection.
 */

import { setCSRFToken, getCSRFToken } from '@/lib/stores/session'
import { apiConfig } from '@/lib/api/config'
import { debugLog, debugError } from '@/lib/utils/debug'
import { sessionManager } from '@/lib/api/sessionManager'

// Get the CSRF cookie name from environment variables or use a default
const CSRF_COOKIE_NAME = import.meta.env.CSRF_COOKIE_NAME || 'csrftoken'

// Track if we're currently handling a CSRF error to prevent loops
let isHandlingCsrfError = false
const CSRF_ERROR_TIMEOUT = 5000 // 5 seconds timeout for handling CSRF errors

/**
 * Get the CSRF token from cookies
 * @returns The CSRF token or null if not found
 */
export function getCsrfTokenFromCookie(): string | null {
	if (typeof document === 'undefined') return null

	const cookies = document.cookie.split(';')
	for (const cookie of cookies) {
		const [name, value] = cookie.trim().split('=')
		if (name === CSRF_COOKIE_NAME) {
			return decodeURIComponent(value)
		}
	}

	return null
}

/**
 * Extract CSRF token from response headers
 * @param headers Response headers object
 * @returns The CSRF token or null if not found
 */
export function getCsrfTokenFromHeaders(headers: Headers): string | null {
	// Check for the token in the standard CSRF header
	const csrfHeader = apiConfig.csrfTokenHeader
	const token = headers.get(csrfHeader)

	if (token) {
		debugLog(`Found CSRF token in ${csrfHeader} header`)
		return token
	}

	// Check for token in X-CSRF-Token header (common alternative)
	const altToken = headers.get('X-CSRF-Token')
	if (altToken) {
		debugLog('Found CSRF token in X-CSRF-Token header')
		return altToken
	}

	// Check for token in Set-Cookie header
	const setCookie = headers.get('Set-Cookie')
	if (setCookie) {
		const match = setCookie.match(new RegExp(`${CSRF_COOKIE_NAME}=([^;]+)`))
		if (match && match[1]) {
			debugLog('Found CSRF token in Set-Cookie header')
			return decodeURIComponent(match[1])
		}
	}

	return null
}

/**
 * Check if a CSRF token exists in cookies
 * @returns True if a CSRF token exists in cookies
 */
export function hasCsrfToken(): boolean {
	return getCsrfTokenFromCookie() !== null
}

/**
 * Sync the CSRF token from the cookie to the store
 * This ensures our store has the same value as the cookie
 * @returns True if token was successfully synced
 */
export function syncCsrfTokenFromCookie(): boolean {
	const token = getCsrfTokenFromCookie()
	if (token) {
		debugLog('Syncing CSRF token from cookie to store')
		setCSRFToken(token)
		return true
	}
	return false
}

/**
 * Validate that the CSRF token in the store matches the one in the cookie
 * @returns True if tokens match, false otherwise
 */
export function validateCsrfToken(): boolean {
	const cookieToken = getCsrfTokenFromCookie()
	const storeToken = getCSRFToken()

	if (!cookieToken || !storeToken) {
		debugError('CSRF token validation failed: missing token', {
			hasCookieToken: !!cookieToken,
			hasStoreToken: !!storeToken
		})
		return false
	}

	const isValid = cookieToken === storeToken
	if (!isValid) {
		debugError('CSRF token validation failed: token mismatch', {
			cookieTokenLength: cookieToken.length,
			storeTokenLength: storeToken.length
		})
	}

	return isValid
}

/**
 * Get CSRF headers for API requests
 * @returns Headers object with CSRF token
 */
export function getCsrfHeaders(): HeadersInit {
	const token = getCSRFToken()
	if (!token) {
		debugError('Attempting to get CSRF headers with no token')
		return {}
	}

	return {
		[apiConfig.csrfTokenHeader]: token
	}
}

/**
 * Handle a CSRF error by refreshing the session
 * @returns Promise that resolves when session is refreshed
 */
export async function handleCsrfError(): Promise<void> {
	// Prevent multiple simultaneous CSRF error handling
	if (isHandlingCsrfError) {
		debugLog('Already handling a CSRF error, skipping duplicate handler')
		return
	}

	// Set flag to prevent recursive calls
	isHandlingCsrfError = true

	// Set a timeout to reset the flag in case of errors
	const timeoutId = setTimeout(() => {
		isHandlingCsrfError = false
	}, CSRF_ERROR_TIMEOUT)

	try {
		debugLog('Handling CSRF error by refreshing session')

		// Dispatch event for any listeners
		dispatchCsrfError()

		// Instead of calling reset (which can cause loops),
		// just clear the session and let the next request initialize a new one
		// This breaks the potential recursive loop
		if (typeof document !== 'undefined') {
			// Clear any CSRF cookies directly
			document.cookie = 'csrftoken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
			document.cookie = 'sessionid=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
		}

		// Clear the session store directly without calling the API
		// This will force a new session to be created on the next request
		const sessionModule = await import('@/lib/stores/session')
		sessionModule.clearSession()
	} finally {
		// Clear the timeout and reset the flag
		clearTimeout(timeoutId)
		isHandlingCsrfError = false
	}
}

/**
 * Create a listener for CSRF errors that will trigger session reinitialization
 * @param callback Optional callback to run when CSRF error occurs
 * @returns A function to remove the listener
 */
export function createCsrfErrorListener(callback?: () => void): () => void {
	if (typeof window === 'undefined') return () => {}

	const handleCsrfError = (event: Event) => {
		debugLog('CSRF error event detected')

		// Run callback if provided
		if (callback) {
			callback()
		} else {
			// Default behavior: refresh the session
			// Use skipClose=true to prevent potential loops
			sessionManager.reset(true).catch((error) => {
				debugError('Failed to reset session after CSRF error', error)
			})
		}
	}

	// Create a custom event type for CSRF errors
	window.addEventListener('csrf-error', handleCsrfError)

	// Return a function to remove the listener
	return () => {
		window.removeEventListener('csrf-error', handleCsrfError)
	}
}

/**
 * Dispatch a CSRF error event
 * This will trigger any listeners that are set up to handle CSRF errors
 */
export function dispatchCsrfError(): void {
	if (typeof window !== 'undefined') {
		debugLog('Dispatching CSRF error event')
		const event = new CustomEvent('csrf-error')
		window.dispatchEvent(event)
	}
}

/**
 * Set up CSRF token refresh on page visibility change
 * This helps ensure the CSRF token is valid when a user returns to the app
 * @returns A function to remove the listener
 */
export function setupCsrfRefreshOnVisibilityChange(): () => void {
	if (typeof document === 'undefined') return () => {}

	const handleVisibilityChange = () => {
		if (document.visibilityState === 'visible') {
			debugLog('Page became visible, validating CSRF token')
			if (!validateCsrfToken()) {
				debugLog('CSRF token invalid after visibility change, refreshing session')
				// Use skipClose=true to prevent potential loops
				sessionManager.reset(true).catch((error) => {
					debugError('Failed to reset session after visibility change', error)
				})
			}
		}
	}

	document.addEventListener('visibilitychange', handleVisibilityChange)

	return () => {
		document.removeEventListener('visibilitychange', handleVisibilityChange)
	}
}

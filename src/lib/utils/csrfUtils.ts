/**
 * CSRF Token Utilities
 *
 * Provides utilities for working with CSRF tokens, implementing the Double Submit Cookie pattern
 * for CSRF protection as described in the API documentation.
 */

import { debugLog, debugError } from '@/lib/utils/debug'
import { apiConfig } from '@/lib/api/config'

// Get the CSRF cookie name from environment variables or use a default
const CSRF_COOKIE_NAME = import.meta.env.CSRF_COOKIE_NAME || 'csrftoken'

/**
 * Get the CSRF token from cookies
 * @returns The CSRF token or null if not found
 */
export function getCsrfTokenFromCookie(): string | null {
	if (typeof document === 'undefined') return null

	// First try the standard cookie parsing approach
	const cookies = document.cookie.split(';')
	for (const cookie of cookies) {
		const [name, value] = cookie.trim().split('=')
		if (name === CSRF_COOKIE_NAME && value) {
			try {
				// The token might be URL encoded or contain special characters
				const decodedValue = decodeURIComponent(value)
				return decodedValue
			} catch (e) {
				debugError('Failed to decode CSRF token from cookie', e)
				return value // Return the raw value if decoding fails
			}
		}
	}

	// If not found with the standard approach, try a more direct approach
	// Some browsers might handle cookie parsing differently
	const cookieValue = document.cookie.replace(
		new RegExp(`(?:(?:^|.*;\\s*)${CSRF_COOKIE_NAME}\\s*\\=\\s*([^;]*).*$)|^.*$`),
		'$1'
	)

	if (cookieValue) {
		try {
			const decodedValue = decodeURIComponent(cookieValue)
			return decodedValue
		} catch (e) {
			return cookieValue
		}
	}

	debugLog('No CSRF token found in cookies')
	return null
}

/**
 * Set the CSRF token in a cookie
 * This implements the "double cookie" method for CSRF protection
 * The server sets an HttpOnly cookie with the session, and we set a JavaScript-accessible
 * cookie with the CSRF token from the response body
 *
 * @param token The CSRF token to set
 */
export function setCsrfTokenCookie(token: string): void {
	if (typeof document === 'undefined') return

	debugLog('Setting CSRF token in cookie:', token)

	// Calculate expiration (24 hours from now)
	const expires = new Date()
	expires.setHours(expires.getHours() + 24)

	// Set cookie attributes based on environment
	// In production, we always use Secure and SameSite=None
	// In development with HTTP, we can't use SameSite=None without Secure
	const isSecure = window.location.protocol === 'https:'

	// Try multiple approaches to ensure the cookie is set correctly
	// First, try the most compatible approach
	let cookieString = `${CSRF_COOKIE_NAME}=${token};path=/;expires=${expires.toUTCString()}`

	// Add Secure attribute if using HTTPS
	if (isSecure) {
		cookieString += ';Secure'

		// SameSite=None requires Secure attribute
		cookieString += ';SameSite=None'
	} else {
		// For local development with HTTP
		cookieString += ';SameSite=Lax'
	}

	// Set the cookie
	document.cookie = cookieString

	// Also try a simpler approach as some browsers have issues with complex cookie strings
	setTimeout(() => {
		// Check if the cookie was set correctly
		const storedToken = getCsrfTokenFromCookie()
		if (storedToken !== token) {
			debugError('CSRF token was not set correctly in cookie, trying alternative approach', {
				expected: token,
				actual: storedToken
			})

			// Try a simpler approach
			document.cookie = `${CSRF_COOKIE_NAME}=${token};path=/;max-age=86400`

			// Try a third approach with SameSite=None if secure
			if (isSecure) {
				setTimeout(() => {
					const secondCheck = getCsrfTokenFromCookie()
					if (secondCheck !== token) {
						debugError('Second attempt failed, trying with explicit SameSite=None')
						document.cookie = `${CSRF_COOKIE_NAME}=${token};path=/;max-age=86400;SameSite=None;Secure`
					}
				}, 50)
			}
		}
	}, 50)
}

/**
 * Check if a CSRF token exists in cookies
 * @returns True if a CSRF token exists in cookies
 */
export function hasCsrfToken(): boolean {
	return getCsrfTokenFromCookie() !== null
}

/**
 * Get CSRF headers for API requests
 * @returns Headers object with CSRF token
 */
export function getCsrfHeaders(): HeadersInit {
	const token = getCsrfTokenFromCookie()
	if (!token) {
		debugError('Attempting to get CSRF headers with no token')
		return {}
	}

	// Include both capitalized and lowercase versions for compatibility
	return {
		[apiConfig.csrfTokenHeader]: token,
		'X-CSRF-Token': token,
		'x-csrf-token': token
	}
}

/**
 * Create a custom event that will be dispatched when a CSRF error occurs
 * This allows components to listen for CSRF errors and handle them appropriately
 */
export function dispatchCsrfError(): void {
	if (typeof window === 'undefined') return

	debugLog('Dispatching CSRF error event')
	const csrfErrorEvent = new CustomEvent('csrf:error', {
		bubbles: true,
		cancelable: false,
		detail: { timestamp: new Date().toISOString() }
	})

	window.dispatchEvent(csrfErrorEvent)
}

/**
 * Create a listener for CSRF errors
 * @param handler Function to call when a CSRF error occurs
 * @returns Function to remove the listener
 */
export function createCsrfErrorListener(handler: () => void): () => void {
	if (typeof window === 'undefined') return () => {}

	const listener = () => {
		debugLog('CSRF error event received')
		handler()
	}

	window.addEventListener('csrf:error', listener)
	return () => window.removeEventListener('csrf:error', listener)
}

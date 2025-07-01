/**
 * CSRF Token Utilities
 *
 * Provides utilities for working with CSRF tokens.
 */

import { debugLog, debugError } from '@/lib/utils/debug'
import { apiConfig } from '@/lib/api/config'
import { csrfToken } from '../stores/session'

// Get the CSRF cookie name from environment variables or use a default
const CSRF_COOKIE_NAME = import.meta.env.CSRF_COOKIE_NAME || 'csrftoken'

/**
 * Get the CSRF token from the store
 * @returns The CSRF token or null if not found
 */
export function getCsrfTokenFromStore(): string | null {
	if (typeof document === 'undefined') return null

	// Only check the nanostore for the token
	const token = csrfToken.get()
	if (token) {
		return token
	}

	// No token in store
	return null
}

/**
 * Get CSRF headers for API requests
 * @param token CSRF token to use
 * @returns Headers object with CSRF token
 */
export function getCsrfHeaders(token: string): HeadersInit {
	if (!token) {
		debugError('Attempting to get CSRF headers with no token')
		return {}
	}

	// Use the configured header name from apiConfig
	const headerName = apiConfig.csrfTokenHeader || 'X-CSRF-Token'

	return {
		[headerName]: token
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

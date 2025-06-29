/**
 * CSRF Token Utilities
 *
 * Provides utilities for working with CSRF tokens from cookies.
 * The session is managed by the server through HTTP-only cookies.
 */

import { debugLog } from '@/lib/utils/debug'
import { getCsrfTokenFromCookie } from '@/lib/utils/csrfUtils'

/**
 * Get the CSRF token from cookies
 * @returns The CSRF token or null if not found
 */
export function getCSRFToken(): string | null {
	return getCsrfTokenFromCookie()
}

/**
 * Check if a CSRF token exists in cookies
 * @returns True if a CSRF token exists in cookies
 */
export function hasCsrfToken(): boolean {
	return getCSRFToken() !== null
}

/**
 * Dummy function for backward compatibility
 * In the new implementation, we don't need to store the CSRF token
 * as it's managed by cookies
 */
export function setCSRFToken(): void {
	// Do nothing - token is managed by cookies
	debugLog('setCSRFToken called - this is a no-op as tokens are managed by cookies')
}

/**
 * Dummy function for backward compatibility
 * In the new implementation, we don't need to clear the session
 * as it's managed by the server
 */
export function clearSession(): void {
	// Do nothing - session is managed by server
	debugLog('clearSession called - this is a no-op as session is managed by server')
}

// Export dummy session store for backward compatibility
export const sessionStore = {
	get: () => ({
		csrfToken: getCSRFToken(),
		isInitialized: hasCsrfToken(),
		isInitializing: false,
		initializationAttempts: 0
	}),
	set: () => {
		// Do nothing - session is managed by server
	},
	subscribe: () => {
		// Return unsubscribe function
		return () => {}
	}
}

// Dummy functions for backward compatibility
export function getInitialized(): boolean {
	return hasCsrfToken()
}

export function getInitializing(): boolean {
	return false
}

export function setInitializing(): void {
	// Do nothing
}

export function setInitializationError(): void {
	// Do nothing
}

export function isSessionValid(): boolean {
	return hasCsrfToken()
}

export function syncCsrfTokenFromCookie(): boolean {
	// No need to sync as we always read directly from cookie
	return hasCsrfToken()
}

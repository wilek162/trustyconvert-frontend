/**
 * Session Store
 *
 * Provides state management for session data using nanostores.
 */
import { atom, onMount } from 'nanostores'
import { getCsrfTokenFromCookie } from '@/lib/utils/csrfUtils'
import { debugLog, debugError } from '@/lib/utils/debug'

// Create atom store for session state
export const csrfToken = atom<string | null>(null)
export const sessionInitialized = atom<boolean>(false)

// Initialize from cookie on mount (only for initial page load)
onMount(csrfToken, () => {
	// Check if we have a token in cookie
	const cookieToken = getCsrfTokenFromCookie()
	if (cookieToken) {
		csrfToken.set(cookieToken)
		sessionInitialized.set(true)
		debugLog('Session store initialized from cookie')
	}
})

/**
 * Check if a CSRF token exists
 */
export function hasCsrfToken(): boolean {
	return csrfToken.get() !== null || getCsrfTokenFromCookie() !== null
}

/**
 * Update CSRF token in store
 */
export function updateCsrfToken(token: string | null): void {
	if (!token) {
		debugError('Attempted to set null CSRF token')
		return
	}

	// Set in store
	csrfToken.set(token)

	// Mark session as initialized
	sessionInitialized.set(true)

	debugLog('CSRF token updated in store')
}

/**
 * Clear session data
 */
export function clearSession(): void {
	csrfToken.set(null)
	sessionInitialized.set(false)
	debugLog('Session store cleared')
}

/**
 * Get the CSRF token
 */
export function getCSRFToken(): string | null {
	return csrfToken.get() || getCsrfTokenFromCookie()
}

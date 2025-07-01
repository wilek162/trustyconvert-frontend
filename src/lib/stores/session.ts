/**
 * Session Store
 *
 * Provides state management for session data using nanostores.
 */
import { atom, onMount } from 'nanostores'
import { getCsrfTokenFromStore } from '@/lib/utils/csrfUtils'
import { debugLog, debugError } from '@/lib/utils/debug'

// Create atom store for session state
export const csrfToken = atom<string | null>(null)
export const sessionInitialized = atom<boolean>(false)

// Initialize from store on mount (only for initial page load)
onMount(csrfToken, () => {
	// Check if we have a token in store already
	const storeToken = getCsrfTokenFromStore()
	if (storeToken) {
		csrfToken.set(storeToken)
		sessionInitialized.set(true)
		debugLog('Session store initialized')
	}
})

/**
 * Check if a CSRF token exists
 */
export function hasCsrfToken(): boolean {
	return csrfToken.get() !== null
}

/**
 * Update CSRF token in store
 */
export function updateCsrfToken(token: string | null): void {
	if (!token) {
		debugError('Attempted to set null CSRF token')
		return
	}

	try {
		// Set in store
		csrfToken.set(token)

		// Verify the token was set correctly
		const storedToken = csrfToken.get()
		if (storedToken !== token) {
			debugError('CSRF token update verification failed - token mismatch')
			console.error('Token mismatch:', { original: token, stored: storedToken })

			// Try setting it again
			csrfToken.set(token)

			// Check again
			const recheckToken = csrfToken.get()
			if (recheckToken !== token) {
				debugError('CSRF token update failed after retry')
			} else {
				debugLog('CSRF token updated successfully after retry')
			}
			return
		}

		// Mark session as initialized
		sessionInitialized.set(true)

		debugLog('CSRF token updated in store')
	} catch (error) {
		debugError('Error updating CSRF token:', error)
	}
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
	return csrfToken.get()
}

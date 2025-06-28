/**
 * CSRF Token Utilities
 *
 * Provides utilities for working with CSRF tokens, implementing the Double Submit Cookie pattern
 * for CSRF protection.
 */

import { setCSRFToken } from '@/lib/stores/session'
import { apiConfig } from '@/lib/api/config'

const CSRF_COOKIE_NAME = 'csrftoken'

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
 * Check if a CSRF token exists in cookies
 * @returns True if a CSRF token exists in cookies
 */
export function hasCsrfToken(): boolean {
	return getCsrfTokenFromCookie() !== null
}

/**
 * Sync the CSRF token from the cookie to the store
 * This ensures our store has the same value as the cookie
 */
export function syncCsrfTokenFromCookie(): void {
	const token = getCsrfTokenFromCookie()
	if (token) {
		setCSRFToken(token)
	}
}

/**
 * Create a listener for CSRF errors that will trigger session reinitialization
 * @returns A function to remove the listener
 */
export function createCsrfErrorListener(): () => void {
	const handleCsrfError = (event: CustomEvent) => {
		console.warn('CSRF error detected, reinitializing session')
		// Trigger session reinitialization
		window.location.reload()
	}

	// Create a custom event type for CSRF errors
	window.addEventListener('csrf-error', handleCsrfError as EventListener)

	// Return a function to remove the listener
	return () => {
		window.removeEventListener('csrf-error', handleCsrfError as EventListener)
	}
}

/**
 * Dispatch a CSRF error event
 * This will trigger any listeners that are set up to handle CSRF errors
 */
export function dispatchCsrfError(): void {
	if (typeof window !== 'undefined') {
		const event = new CustomEvent('csrf-error')
		window.dispatchEvent(event)
	}
}

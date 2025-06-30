/**
 * CSRF Token Utilities
 *
 * Provides utilities for working with CSRF tokens from cookies.
 * The session is managed by the server through HTTP-only cookies.
 */
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

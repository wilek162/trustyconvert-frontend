import { atom } from 'nanostores'
import { handleError } from '@/lib/utils/errorHandling'

interface SessionState {
	csrfToken: string | null
	isInitialized: boolean
	isInitializing: boolean
	sessionId?: string
	expiresAt?: string
	initializationAttempts: number
	lastInitializationError?: string
}

// Create the session store with initial state
export const sessionStore = atom<SessionState>({
	csrfToken: null,
	isInitialized: false,
	isInitializing: false,
	initializationAttempts: 0
})

/**
 * Set the CSRF token in the session store
 * @param token The CSRF token from the API
 * @param sessionId The session ID (optional)
 * @param expiresAt When the session expires (optional)
 */
export function setCSRFToken(token: string, sessionId?: string, expiresAt?: string): void {
	sessionStore.set({
		...sessionStore.get(),
		csrfToken: token,
		sessionId,
		expiresAt,
		isInitialized: true,
		isInitializing: false
	})
}

/**
 * Get the current CSRF token
 * @returns The current CSRF token or null if not set
 */
export function getCSRFToken(): string | null {
	return sessionStore.get().csrfToken
}

/**
 * Get session ID
 * @returns The current session ID or undefined
 */
export function getSessionId(): string | undefined {
	return sessionStore.get().sessionId
}

/**
 * Get session expiration date
 * @returns Session expiration timestamp or undefined
 */
export function getSessionExpiry(): string | undefined {
	return sessionStore.get().expiresAt
}

/**
 * Get session initialization status
 * @returns Whether the session is currently being initialized
 */
export function getInitializing(): boolean {
	return sessionStore.get().isInitializing
}

/**
 * Get session initialized status
 * @returns Whether the session has been successfully initialized
 */
export function getInitialized(): boolean {
	return sessionStore.get().isInitialized
}

/**
 * Set session initialization status
 * @param status Whether the session is being initialized
 */
export function setInitializing(status: boolean): void {
	sessionStore.set({
		...sessionStore.get(),
		isInitializing: status,
		// If turning off initialization, don't reset attempts
		// If turning on initialization, increment attempts
		initializationAttempts: status
			? sessionStore.get().initializationAttempts + 1
			: sessionStore.get().initializationAttempts
	})
}

/**
 * Record an initialization error
 * @param error Error message
 */
export function setInitializationError(error: string): void {
	sessionStore.set({
		...sessionStore.get(),
		lastInitializationError: error
	})
}

/**
 * Clear the session store (used during cleanup)
 */
export function clearSession(): void {
	sessionStore.set({
		csrfToken: null,
		isInitialized: false,
		isInitializing: false,
		sessionId: undefined,
		expiresAt: undefined,
		initializationAttempts: 0,
		lastInitializationError: undefined
	})
}

/**
 * Check if a CSRF token exists in the cookies
 * @returns Whether a CSRF token exists in cookies
 */
export function hasCsrfToken(): boolean {
	if (typeof document === 'undefined') return false

	// Check for token in cookies
	const cookies = document.cookie.split(';')
	return cookies.some((cookie) => cookie.trim().startsWith('csrftoken='))
}

/**
 * Sync CSRF token from cookie to store
 * This is used when the server sets a CSRF token cookie
 * @returns Whether a token was found and synced
 */
export function syncCsrfTokenFromCookie(): boolean {
	if (typeof document === 'undefined') return false

	// Get token from cookies
	const cookies = document.cookie.split(';')
	const csrfCookie = cookies.find((cookie) => cookie.trim().startsWith('csrftoken='))

	if (csrfCookie) {
		const token = csrfCookie.trim().substring('csrftoken='.length)
		if (token) {
			setCSRFToken(token)
			return true
		}
	}

	return false
}

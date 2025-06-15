import { atom } from 'nanostores'

interface SessionState {
	csrfToken: string | null
	isInitialized: boolean
	isInitializing: boolean
	sessionId?: string
	expiresAt?: string
}

// Create the session store with initial state
export const sessionStore = atom<SessionState>({
	csrfToken: null,
	isInitialized: false,
	isInitializing: false
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
		isInitializing: status
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
		expiresAt: undefined
	})
}

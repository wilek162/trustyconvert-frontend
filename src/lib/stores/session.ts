import { atom } from 'nanostores'
import { handleError } from '@/lib/utils/errorHandling'
import { debugLog } from '@/lib/utils/debug'

/**
 * Session state interface
 * Contains all session-related information
 */
interface SessionState {
	csrfToken: string | null
	isInitialized: boolean
	isInitializing: boolean
	sessionId?: string
	expiresAt?: string
	initializationAttempts: number
	lastInitializationError?: string
	lastInitializedAt?: string
}

// Storage keys for persisting session data
const STORAGE_KEYS = {
	SESSION_STATE: 'trustyconvert_session_state',
	CSRF_TOKEN: 'trustyconvert_csrf_token',
	SESSION_ID: 'trustyconvert_session_id',
	EXPIRES_AT: 'trustyconvert_expires_at'
}

/**
 * Load persisted session data from storage
 * @returns Partial session state with persisted values
 */
function loadPersistedSession(): Partial<SessionState> {
	if (typeof sessionStorage === 'undefined') return {}

	try {
		// Try to load the full session state first
		const savedState = sessionStorage.getItem(STORAGE_KEYS.SESSION_STATE)
		if (savedState) {
			const parsedState = JSON.parse(savedState) as Partial<SessionState>
			debugLog('Loaded persisted session state', parsedState)
			return parsedState
		}

		// Fall back to individual items if full state isn't available
		const csrfToken = sessionStorage.getItem(STORAGE_KEYS.CSRF_TOKEN)
		const sessionId = sessionStorage.getItem(STORAGE_KEYS.SESSION_ID)
		const expiresAt = sessionStorage.getItem(STORAGE_KEYS.EXPIRES_AT)

		if (csrfToken || sessionId) {
			debugLog('Loaded individual session items', {
				csrfToken: !!csrfToken,
				sessionId: !!sessionId
			})
			return {
				csrfToken: csrfToken || null,
				sessionId: sessionId || undefined,
				expiresAt: expiresAt || undefined,
				isInitialized: !!csrfToken
			}
		}
	} catch (error) {
		console.error('Failed to load persisted session:', error)
	}

	return {}
}

// Create the session store with initial state and persisted data
export const sessionStore = atom<SessionState>({
	csrfToken: null,
	isInitialized: false,
	isInitializing: false,
	initializationAttempts: 0,
	...loadPersistedSession()
})

/**
 * Persist session data to storage
 * @param state Current session state
 */
function persistSessionData(state: SessionState): void {
	if (typeof sessionStorage === 'undefined') return

	try {
		// Only persist non-sensitive and necessary data
		const persistedState = {
			csrfToken: state.csrfToken,
			sessionId: state.sessionId,
			expiresAt: state.expiresAt,
			isInitialized: state.isInitialized,
			lastInitializedAt: new Date().toISOString()
		}

		// Save the full state
		sessionStorage.setItem(STORAGE_KEYS.SESSION_STATE, JSON.stringify(persistedState))

		// Also save individual items for backward compatibility
		if (state.csrfToken) {
			sessionStorage.setItem(STORAGE_KEYS.CSRF_TOKEN, state.csrfToken)
		}
		if (state.sessionId) {
			sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, state.sessionId)
		}
		if (state.expiresAt) {
			sessionStorage.setItem(STORAGE_KEYS.EXPIRES_AT, state.expiresAt)
		}

		debugLog('Persisted session data', { hasToken: !!state.csrfToken, sessionId: state.sessionId })
	} catch (error) {
		console.error('Failed to persist session data:', error)
	}
}

/**
 * Set the CSRF token in the session store
 * @param token The CSRF token from the API
 * @param sessionId The session ID (optional)
 * @param expiresAt When the session expires (optional)
 */
export function setCSRFToken(token: string, sessionId?: string, expiresAt?: string): void {
	const newState = {
		...sessionStore.get(),
		csrfToken: token,
		sessionId,
		expiresAt,
		isInitialized: true,
		isInitializing: false,
		lastInitializedAt: new Date().toISOString()
	}

	sessionStore.set(newState)
	persistSessionData(newState)
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
 * Check if the current session is valid (not expired)
 * @returns Whether the session is valid and not expired
 */
export function isSessionValid(): boolean {
	const state = sessionStore.get()

	// Check if we have a token and are initialized
	if (!state.csrfToken || !state.isInitialized) {
		debugLog('Session invalid: missing token or not initialized', {
			hasToken: !!state.csrfToken,
			isInitialized: state.isInitialized
		})
		return false
	}

	// Check expiration if available
	if (state.expiresAt) {
		try {
			const expiryDate = new Date(state.expiresAt)
			const now = new Date()

			// Validate that expiry date is valid
			if (isNaN(expiryDate.getTime())) {
				debugLog('Session invalid: expiry date is invalid', { expiry: state.expiresAt })
				return false
			}

			// Session is invalid if expiry date is in the past
			if (expiryDate < now) {
				debugLog('Session expired', { expiry: state.expiresAt, now: now.toISOString() })
				return false
			}
		} catch (error) {
			debugLog('Session invalid: error parsing expiry date', { expiry: state.expiresAt, error })
			return false
		}
	} else {
		// If no expiration date is set, consider the session valid
		// This is a fallback for APIs that don't provide expiration
		debugLog('No expiration date set for session, assuming valid')
	}

	return true
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
	const newState = {
		...sessionStore.get(),
		isInitializing: status,
		// If turning off initialization, don't reset attempts
		// If turning on initialization, increment attempts
		initializationAttempts: status
			? sessionStore.get().initializationAttempts + 1
			: sessionStore.get().initializationAttempts
	}

	sessionStore.set(newState)
}

/**
 * Record an initialization error
 * @param error Error message
 */
export function setInitializationError(error: string): void {
	const newState = {
		...sessionStore.get(),
		lastInitializationError: error
	}

	sessionStore.set(newState)
}

/**
 * Clear the session store (used during cleanup)
 */
export function clearSession(): void {
	// Clear the store
	sessionStore.set({
		csrfToken: null,
		isInitialized: false,
		isInitializing: false,
		sessionId: undefined,
		expiresAt: undefined,
		initializationAttempts: 0,
		lastInitializationError: undefined
	})

	// Clear persisted data
	if (typeof sessionStorage !== 'undefined') {
		sessionStorage.removeItem(STORAGE_KEYS.SESSION_STATE)
		sessionStorage.removeItem(STORAGE_KEYS.CSRF_TOKEN)
		sessionStorage.removeItem(STORAGE_KEYS.SESSION_ID)
		sessionStorage.removeItem(STORAGE_KEYS.EXPIRES_AT)
	}

	debugLog('Session cleared')
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

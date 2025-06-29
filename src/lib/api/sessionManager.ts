/**
 * Session Manager
 *
 * Centralized module for managing API session state.
 * This handles session initialization, status tracking, and cleanup.
 *
 * Session Lifecycle:
 * 1. A new session is created when:
 *    - The application loads for the first time
 *    - The existing session has expired
 *    - The user explicitly resets their session
 *    - A session error occurs (e.g., CSRF token mismatch)
 *
 * 2. An existing session is reused when:
 *    - A valid session ID and CSRF token exist in storage/cookies
 *    - The session has not expired
 */

import { apiClient } from './client'
import {
	sessionStore,
	getInitialized,
	getInitializing,
	setInitializing,
	clearSession,
	setCSRFToken,
	syncCsrfTokenFromCookie,
	hasCsrfToken,
	setInitializationError,
	isSessionValid
} from '@/lib/stores/session'
import { debugLog, debugError } from '@/lib/utils/debug'
import { getCsrfTokenFromCookie } from '@/lib/utils/csrfUtils'
import { SESSION } from '@/lib/config/constants'

// Track initialization at the module level to prevent race conditions
let isInitializing = false
let initializationPromise: Promise<void> | null = null
let initializationAttempts = 0
const MAX_INITIALIZATION_ATTEMPTS = 3

// Session initialization lock timeout (15 seconds)
const INITIALIZATION_LOCK_TIMEOUT = 15000

/**
 * Generate a default expiration date if none is provided
 * @returns ISO string for expiration date
 */
function generateDefaultExpiration(): string {
	const now = new Date()
	const expiryTime = now.getTime() + SESSION.DEFAULT_TTL
	return new Date(expiryTime).toISOString()
}

/**
 * Initialize the API session
 * This should be called once during application startup
 *
 * @param forceNew Force creation of a new session even if one exists
 * @param skipClose Skip closing the existing session (to prevent loops)
 * @returns Promise that resolves when initialization is complete
 */
export async function initializeApiSession(forceNew = false, skipClose = false): Promise<void> {
	// If we've exceeded max attempts, log and return to prevent infinite loops
	if (initializationAttempts >= MAX_INITIALIZATION_ATTEMPTS) {
		debugError(
			`Maximum initialization attempts (${MAX_INITIALIZATION_ATTEMPTS}) reached, giving up`
		)
		return Promise.resolve()
	}

	// If already initialized and not forcing new, just return
	if (!forceNew && getInitialized() && isSessionValid()) {
		debugLog('Session already initialized and valid, reusing existing session')
		return Promise.resolve()
	}

	// If initialization is already in progress, return the existing promise
	if (isInitializing && initializationPromise) {
		debugLog('Session initialization already in progress, waiting for completion')
		return initializationPromise
	}

	// Set initializing state
	isInitializing = true
	setInitializing(true)
	initializationAttempts++

	debugLog('Starting session initialization', {
		forceNew,
		attempt: initializationAttempts,
		maxAttempts: MAX_INITIALIZATION_ATTEMPTS
	})

	// Create a timeout to clear the initialization lock if it takes too long
	const lockTimeoutId = setTimeout(() => {
		if (isInitializing) {
			debugError('Session initialization lock timeout exceeded, resetting lock')
			isInitializing = false
			setInitializing(false)
			initializationPromise = null
		}
	}, INITIALIZATION_LOCK_TIMEOUT)

	// Create a new initialization promise
	initializationPromise = (async () => {
		try {
			// First check if we already have a valid token in the cookie and we're not forcing new
			if (!forceNew && hasCsrfToken() && isSessionValid()) {
				debugLog('Found existing CSRF token in cookie, syncing to store')
				syncCsrfTokenFromCookie()
				return
			}

			// Initialize the session - this will cause the server to set a cookie
			debugLog('Calling API to initialize session')
			const sessionData = await apiClient.initSession()

			// If the API returned a CSRF token directly, store it
			if (sessionData && sessionData.csrf_token) {
				// Ensure we have a valid expiration date
				const expiresAt = sessionData.expires_at || generateDefaultExpiration()

				debugLog('Received CSRF token from API response', {
					sessionId: sessionData.id,
					expiresAt: expiresAt,
					hasToken: !!sessionData.csrf_token
				})

				setCSRFToken(sessionData.csrf_token, sessionData.id, expiresAt)

				// Reset attempt counter on success
				initializationAttempts = 0
			} else {
				// Otherwise try to get it from the cookie
				debugLog('No CSRF token in API response data, checking cookies')
				const csrfToken = getCsrfTokenFromCookie()
				if (csrfToken) {
					debugLog('Found CSRF token in cookie after initialization')
					// Ensure we have a valid expiration date
					const expiresAt = sessionData?.expires_at || generateDefaultExpiration()
					setCSRFToken(csrfToken, sessionData?.id, expiresAt)
					initializationAttempts = 0
				} else {
					// If we still don't have a token, try again with a forced new session
					// but only if we haven't tried too many times already
					if (initializationAttempts < MAX_INITIALIZATION_ATTEMPTS - 1) {
						debugError('No CSRF token found in cookies after initialization, forcing new session')
						clearTimeout(lockTimeoutId)
						isInitializing = false
						setInitializing(false)
						initializationPromise = null
						return initializeApiSession(true, true)
					} else {
						debugError(
							'No CSRF token found in cookies after initialization and max attempts reached'
						)
					}
				}
			}

			debugLog('Session initialization completed successfully')
		} catch (error) {
			// Record the error
			const errorMessage = error instanceof Error ? error.message : String(error)
			debugError('Session initialization error', error)
			setInitializationError(errorMessage)
			// We don't rethrow the error here to prevent unhandled promise rejections
		} finally {
			// Reset initialization state
			isInitializing = false
			setInitializing(false)
			clearTimeout(lockTimeoutId)
		}
	})()

	return initializationPromise
}

/**
 * Reset the session state and initialize a new session
 * This will force a new session to be created
 *
 * @param skipClose Skip closing the existing session (to prevent loops)
 * @returns Promise that resolves when initialization is complete
 */
export async function resetApiSession(skipClose = false): Promise<void> {
	debugLog('Resetting API session', { skipClose })

	// Try to close the current session first if not skipping
	if (!skipClose) {
		try {
			await closeApiSession(true)
		} catch (error) {
			debugError('Error while closing session during reset', error)
			// Continue with reset even if close fails
		}
	} else {
		// Just clear the session state without API call
		clearSession()
	}

	// Reset the initialization flag
	isInitializing = false
	initializationPromise = null

	// Initialize a new session with forceNew=true and skipClose=true to prevent loops
	return initializeApiSession(true, true)
}

/**
 * Close the current API session
 * This should be called when the user is done with the application
 *
 * @param skipApiCall Skip the API call to close the session (to prevent loops)
 * @returns Promise that resolves when the session is closed
 */
export async function closeApiSession(skipApiCall = false): Promise<void> {
	debugLog('Closing API session', { skipApiCall })

	try {
		// Only attempt to close if we have an initialized session and not skipping API call
		if (getInitialized() && !skipApiCall) {
			await apiClient.closeSession()
			debugLog('API session closed successfully')
		} else {
			debugLog('No active session to close or skipping API call')
		}
	} catch (error) {
		debugError('Failed to close API session', error)
	} finally {
		// Always clear the session state regardless of API success
		clearSession()
		isInitializing = false
		initializationPromise = null
		// Don't reset initializationAttempts here to prevent rapid retries
	}
}

/**
 * Reset the initialization attempt counter
 * This should be called when the user explicitly requests a new session
 */
export function resetInitializationAttempts(): void {
	initializationAttempts = 0
	debugLog('Reset initialization attempts counter')
}

/**
 * Check if the current session needs to be refreshed
 * This checks if the session is about to expire and refreshes it if needed
 *
 * @param expiryThresholdMs Time in ms before expiry when session should be refreshed
 * @returns Promise that resolves when refresh check is complete
 */
export async function checkSessionRefresh(expiryThresholdMs = 5 * 60 * 1000): Promise<void> {
	const state = sessionStore.get()

	// If not initialized, try to initialize
	if (!state.isInitialized) {
		debugLog('Session not initialized during refresh check, initializing')
		return initializeApiSession()
	}

	// If no CSRF token, session is invalid regardless of expiry
	if (!state.csrfToken) {
		debugLog('No CSRF token found during refresh check, resetting session')
		resetInitializationAttempts()
		return resetApiSession(true) // Skip close to avoid API calls with invalid session
	}

	// If no expiry date, set a default one
	if (!state.expiresAt) {
		debugLog('No expiration date found during refresh check, setting default expiry')
		const defaultExpiry = generateDefaultExpiration()
		setCSRFToken(state.csrfToken, state.sessionId, defaultExpiry)
		return
	}

	try {
		const expiryDate = new Date(state.expiresAt)
		const now = new Date()

		// Check if expiry date is valid
		if (isNaN(expiryDate.getTime())) {
			debugLog('Invalid expiration date during refresh check, resetting session')
			resetInitializationAttempts()
			return resetApiSession(true)
		}

		const timeUntilExpiry = expiryDate.getTime() - now.getTime()

		// If session is expired, reset it
		if (timeUntilExpiry <= 0) {
			debugLog('Session expired during refresh check, resetting', {
				expiresAt: state.expiresAt,
				now: now.toISOString()
			})
			resetInitializationAttempts()
			return resetApiSession()
		}

		// If session is about to expire, refresh it
		if (timeUntilExpiry < expiryThresholdMs) {
			debugLog('Session expiring soon, refreshing', {
				expiresAt: state.expiresAt,
				timeUntilExpiry: `${Math.round(timeUntilExpiry / 1000)}s`
			})
			// Reset the attempt counter before refreshing to ensure it can succeed
			resetInitializationAttempts()
			return resetApiSession()
		}

		debugLog('Session valid, no refresh needed', {
			expiresAt: state.expiresAt,
			timeUntilExpiry: `${Math.round(timeUntilExpiry / 1000)}s`
		})
	} catch (error) {
		debugError('Error checking session expiry', error)
		resetInitializationAttempts()
		return resetApiSession(true)
	}
}

/**
 * Get the current session state
 *
 * @returns Current session state
 */
export function getSessionState() {
	const state = sessionStore.get()
	return {
		isInitialized: state.isInitialized,
		isInitializing: state.isInitializing,
		sessionId: state.sessionId,
		expiresAt: state.expiresAt,
		error: state.lastInitializationError,
		attempts: initializationAttempts,
		isValid: isSessionValid()
	}
}

/**
 * Convenience object for session management
 * This provides a more object-oriented interface to the session functions
 */
export const sessionManager = {
	initialize: initializeApiSession,
	reset: resetApiSession,
	close: closeApiSession,
	checkRefresh: checkSessionRefresh,
	resetAttempts: resetInitializationAttempts,
	getState: getSessionState
}

export default sessionManager

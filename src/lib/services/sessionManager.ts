/**
 * Session Manager Service
 *
 * Handles session initialization and management, acting as a bridge between
 * server-managed sessions and client-side state.
 */

import { debugLog, debugError } from '@/lib/utils/debug'
import { csrfToken, sessionInitialized, updateCsrfToken, clearSession } from '@/lib/stores/session'
import { getCsrfTokenFromCookie, getCsrfHeaders, dispatchCsrfError } from '@/lib/utils/csrfUtils'
import { apiConfig } from '@/lib/api/config'
import client from '../api/client'

// Global session initialization state
let isInitializing = false
let initializationPromise: Promise<boolean> | null = null
let lastInitAttempt = 0
const MIN_INIT_INTERVAL = 2000 // Minimum time between initialization attempts (ms)

// Track last error for debugging
let lastInitError: unknown = null

/**
 * Session Manager Class
 * Handles all session-related functionality as a singleton
 */
class SessionManager {
	/**
	 * Check if a CSRF token exists in the store or cookie
	 */
	hasCsrfToken(): boolean {
		return csrfToken.get() !== null || getCsrfTokenFromCookie() !== null
	}

	/**
	 * Get the current CSRF token
	 * First checks the store, then falls back to cookie if needed
	 */
	getCsrfToken(): string | null {
		// First check the store
		const storeToken = csrfToken.get()
		if (storeToken) return storeToken

		// If not in store, check cookie and update store if found
		const cookieToken = getCsrfTokenFromCookie()
		if (cookieToken) {
			// Update the store with the cookie value
			this.setCsrfToken(cookieToken)
			return cookieToken
		}

		return null
	}

	/**
	 * Get the CSRF token from cookie directly
	 * Exposed for debugging purposes
	 */
	getCsrfTokenFromCookie(): string | null {
		return getCsrfTokenFromCookie()
	}

	/**
	 * Set the CSRF token in the store
	 */
	setCsrfToken(token: string): boolean {
		if (!token) {
			debugError('Attempted to set empty CSRF token')
			return false
		}

		try {
			// Update the nanostore with the new token
			updateCsrfToken(token)
			sessionInitialized.set(true)
			debugLog('CSRF token set in store and session marked as initialized')
			return true
		} catch (error) {
			debugError('Error setting CSRF token:', error)
			return false
		}
	}

	/**
	 * Synchronize token from cookie to store
	 * Returns true if a token was found and synchronized
	 */
	synchronizeTokenFromCookie(): boolean {
		const cookieToken = getCsrfTokenFromCookie()
		const storeToken = csrfToken.get()

		if (!cookieToken) {
			return false
		}

		// If cookie token exists and differs from store token, update store
		if (cookieToken !== storeToken) {
			debugLog('Synchronizing CSRF token from cookie to store')
			return this.setCsrfToken(cookieToken)
		}

		// Token exists and is already synchronized
		return true
	}

	/**
	 * Get CSRF headers for API requests
	 */
	getCsrfHeaders(): HeadersInit {
		const token = this.getCsrfToken()
		return token ? getCsrfHeaders(token) : {}
	}

	/**
	 * Reset the session state in the client
	 * Does not affect server-side session
	 */
	resetSession(): Promise<boolean> {
		debugLog('Resetting client-side session state')
		clearSession()
		isInitializing = false
		initializationPromise = null
		lastInitAttempt = 0
		lastInitError = null
		return Promise.resolve(true)
	}

	/**
	 * Initialize a session with the API or refresh CSRF token
	 * This is the ONLY method that should make API calls to initialize a session
	 *
	 * @param forceNew Force a new session even if one exists (use sparingly)
	 * @returns Promise that resolves to boolean indicating success
	 */
	async initSession(forceNew = false): Promise<boolean> {
		// First try to synchronize from cookie
		const hasSyncedToken = this.synchronizeTokenFromCookie()

		// If we have a valid token and not forcing new, return immediately
		if (hasSyncedToken && !forceNew) {
			sessionInitialized.set(true)
			return true
		}

		// Debounce initialization attempts
		const now = Date.now()
		if (!forceNew && now - lastInitAttempt < MIN_INIT_INTERVAL) {
			debugLog('Session initialization throttled - recent attempt detected')

			// If we have an existing initialization in progress, return that
			if (initializationPromise && isInitializing) {
				debugLog('Returning existing initialization promise')
				return initializationPromise
			}

			// Otherwise, just return the current state
			return this.hasCsrfToken()
		}

		// Return existing promise if initialization is in progress
		if (initializationPromise && isInitializing) {
			debugLog('Session initialization already in progress, returning existing promise')
			return initializationPromise
		}

		// Start a new initialization
		debugLog('Starting new session initialization')
		isInitializing = true
		lastInitAttempt = now

		// Store the promise in the global variable so other calls can use it
		initializationPromise = (async () => {
			try {
				debugLog('Session Manager: Initializing session with server')

				// Make request to the session init endpoint
				const responseData = await client.initSession()

				if (!responseData || !responseData.csrf_token) {
					const error = new Error('No CSRF token received from server')
					lastInitError = {
						type: 'MissingToken',
						message: 'Session initialization failed - no CSRF token received',
						response: responseData
					}
					debugError('Session initialization failed - no CSRF token received', responseData)
					return false
				}

				// Store the token in our state management
				const tokenSet = this.setCsrfToken(responseData.csrf_token)
				if (!tokenSet) {
					lastInitError = {
						type: 'TokenStoreFailed',
						message: 'Failed to set CSRF token in store',
						token: responseData.csrf_token
					}
					debugError('Failed to set CSRF token in store')
					return false
				}

				// Clear any previous error
				lastInitError = null
				debugLog('Session Manager: Session initialized with CSRF token from server')
				return true
			} catch (error) {
				lastInitError = error
				debugError('Session Manager: Session initialization failed', error)
				return false
			} finally {
				isInitializing = false
				// Keep the promise for a short while to prevent immediate re-initialization
				setTimeout(() => {
					initializationPromise = null
				}, MIN_INIT_INTERVAL)
			}
		})()

		return initializationPromise
	}

	/**
	 * Ensure a valid session exists, with minimal API calls
	 * This should be the primary method used by components
	 */
	async ensureSession(): Promise<boolean> {
		// First try to synchronize from cookie
		if (this.synchronizeTokenFromCookie()) {
			sessionInitialized.set(true)
			return true
		}

		// If no token in cookie or store, initialize a new session
		// This is the last resort when no session exists
		return this.initSession()
	}

	/**
	 * Handle CSRF validation errors
	 */
	handleCsrfError(): void {
		dispatchCsrfError()
		// Don't reset the session here, just notify listeners
	}

	/**
	 * Update the CSRF token when received from server
	 * Call this whenever a new token is received from API responses
	 */
	updateCsrfTokenFromServer(token: string): boolean {
		if (!token) {
			debugError('Received empty CSRF token from server')
			return false
		}

		debugLog('Updating CSRF token from server response')
		return this.setCsrfToken(token)
	}

	/**
	 * Check if a session initialization is currently in progress
	 */
	isInitializationInProgress(): boolean {
		return isInitializing
	}

	/**
	 * Get the current session state for debugging
	 */
	getSessionState() {
		return {
			hasCsrfToken: this.hasCsrfToken(),
			sessionInitialized: sessionInitialized.get(),
			isInitializing,
			lastInitAttempt: new Date(lastInitAttempt).toISOString(),
			lastInitError,
			csrfTokenInStore: csrfToken.get() !== null,
			csrfTokenInCookie: getCsrfTokenFromCookie() !== null
		}
	}

	/**
	 * Get detailed debug information about the session
	 * Only use this in development mode
	 */
	getDebugInfo() {
		if (import.meta.env.DEV) {
			return {
				sessionState: this.getSessionState(),
				csrfToken: this.getCsrfToken(),
				cookieToken: getCsrfTokenFromCookie(),
				lastInitError,
				apiConfig: {
					baseUrl: apiConfig.baseUrl,
					timeout: apiConfig.timeout
				}
			}
		}
		return { mode: 'production' }
	}
}

// Create and export a singleton instance
const sessionManager = new SessionManager()
export default sessionManager

/**
 * Session Manager Service
 *
 * Handles session initialization and management, acting as a bridge between
 * server-managed sessions and client-side state.
 */

import { debugLog, debugError, debugSessionState } from '@/lib/utils/debug'
import { sessionStore, updateCsrfToken, clearSession, getCSRFToken } from '@/lib/stores/session'
import { getCsrfTokenFromStore, getCsrfHeaders, dispatchCsrfError } from '@/lib/utils/csrfUtils'
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
	 * Check if a CSRF token exists in the store
	 */
	hasCsrfToken(): boolean {
		return sessionStore.get().csrfToken !== null
	}

	/**
	 * Get the current CSRF token from the store
	 */
	getCsrfToken(): string | null {
		return sessionStore.get().csrfToken
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
			// Log the token for debugging (only in development)
			if (import.meta.env.DEV) {
				console.group('Setting CSRF Token')
				console.log('Token to set:', token)
				console.log('Current token in store:', this.getCsrfToken())
				console.groupEnd()
			}

			// Update the nanostore with the new token
			updateCsrfToken(token)
			sessionStore.setKey('initialized', true)

			// Verify the token was set correctly
			const storedToken = this.getCsrfToken()

			if (import.meta.env.DEV) {
				console.group('CSRF Token Verification')
				console.log('Token after setting:', storedToken)
				console.log('Token match status:', storedToken === token)
				console.groupEnd()
			}

			if (storedToken !== token) {
				debugError('CSRF token verification failed - token mismatch')
				return false
			}

			debugLog('CSRF token set in store and session marked as initialized')
			return true
		} catch (error) {
			debugError('Error setting CSRF token:', error)
			return false
		}
	}

	/**
	 * Check if a token exists in the store
	 * Returns true if a token was found
	 */
	checkTokenInStore(): boolean {
		const storeToken = this.getCsrfToken()

		if (!storeToken) {
			debugLog('No token found in store')
			return false
		}

		// Token exists in store
		debugLog('Token found in store')
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
		// First check if we have a token in the store
		const hasToken = this.checkTokenInStore()

		// If we have a valid token and not forcing new, return immediately
		if (hasToken && !forceNew) {
			sessionStore.setKey('initialized', true)
			debugLog('Using existing session from store')
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
		try {
			// First check if we have a token in the store
			if (this.checkTokenInStore()) {
				sessionStore.setKey('initialized', true)
				debugLog('Session already initialized in ensureSession')

				if (import.meta.env.DEV) {
					debugSessionState(this, 'sessionManager.ensureSession - using existing token')
				}

				return true
			}

			// If no token in store, initialize a new session
			// This is the last resort when no session exists
			debugLog('No token in store, attempting to initialize session')

			// Check if initialization is already in progress
			if (isInitializing && initializationPromise) {
				debugLog('Session initialization already in progress, waiting for it to complete')

				if (import.meta.env.DEV) {
					debugSessionState(
						this,
						'sessionManager.ensureSession - waiting for in-progress initialization'
					)
				}

				return initializationPromise
			}

			if (import.meta.env.DEV) {
				debugSessionState(this, 'sessionManager.ensureSession - before initSession')
			}

			const result = await this.initSession()

			if (import.meta.env.DEV) {
				debugSessionState(
					this,
					`sessionManager.ensureSession - after initSession (result: ${result})`
				)
			}

			// Critical check: If we have a token but initialization reported false,
			// the session might still be valid
			if (!result) {
				const hasToken = this.hasCsrfToken()
				if (hasToken) {
					debugLog(
						'Session initialization reported failure but token exists - considering session valid'
					)
					sessionStore.setKey('initialized', true)
					return true
				}
			}

			return result
		} catch (error) {
			debugError('Error in ensureSession:', error)

			if (import.meta.env.DEV) {
				debugSessionState(this, 'sessionManager.ensureSession - error')
			}

			// Even if there was an error, check if we have a token
			if (this.hasCsrfToken()) {
				debugLog('Error occurred but token exists - considering session valid')
				sessionStore.setKey('initialized', true)
				return true
			}
			return false
		}
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
			sessionInitialized: sessionStore.get().initialized,
			isInitializing,
			lastInitAttempt: new Date(lastInitAttempt).toISOString(),
			lastInitError,
			csrfTokenInStore: this.getCsrfToken() !== null
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

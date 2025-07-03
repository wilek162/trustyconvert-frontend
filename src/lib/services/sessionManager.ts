/**
 * Session Manager Service
 *
 * Handles session state management, acting as a bridge between
 * server-managed sessions and client-side state.
 */

import { debugLog, debugError, debugSessionState } from '@/lib/utils/debug'
import { sessionStore, updateCsrfToken, clearSession, getCSRFToken } from '@/lib/stores/session'
import { getCsrfTokenFromStore, getCsrfHeaders, dispatchCsrfError } from '@/lib/utils/csrfUtils'
import { apiConfig } from '@/lib/api/config'
import { _apiClient } from '@/lib/api/_apiClient'

// Global session initialization state
let isInitializing = false
let initializationPromise: Promise<boolean> | null = null
let lastInitAttempt = 0
const MIN_INIT_INTERVAL = 2000 // Minimum time between initialization attempts (ms)

// Track last error for debugging
let lastInitError: unknown = null

/**
 * Session Manager Class
 * Handles all session state management as a singleton
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
				console.log('Token to set:', token.substring(0, 5) + '...')
				console.log('Current token in store:', this.getCsrfToken() ? 'exists' : 'none')
				console.groupEnd()
			}

			// Update the nanostore with the new token
			updateCsrfToken(token)
			sessionStore.setKey('initialized', true)

			// Verify the token was set correctly
			const storedToken = this.getCsrfToken()

			if (import.meta.env.DEV) {
				console.group('CSRF Token Verification')
				console.log('Token after setting:', storedToken ? 'exists' : 'none')
				console.log('Token match status:', storedToken === token)
				console.groupEnd()
			}

			if (storedToken !== token) {
				debugError('CSRF token verification failed - token mismatch')
				return false
			}

			// Dispatch an event to notify components that the token has changed
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('csrf-token-changed'))
			}

			debugLog('CSRF token set in store and session marked as initialized')
			return true
		} catch (error) {
			debugError('Error setting CSRF token:', error)
			return false
		}
	}

	/**
	 * Get CSRF headers for requests
	 * @returns Headers object with CSRF token
	 */
	getCsrfHeaders(): HeadersInit {
		const token = this.getCsrfToken()
		if (!token) {
			return {}
		}

		// Use both the primary and alternative CSRF header names for maximum compatibility
		const csrfHeaderName = apiConfig.csrfTokenHeader || 'X-CSRF-Token'
		
		// Return both header formats to ensure compatibility with different server implementations
		return {
			[csrfHeaderName]: token,
				}
	}

	/**
	 * Check if the token exists in the store
	 */
	checkTokenInStore(): boolean {
		return this.getCsrfToken() !== null
	}

	/**
	 * Get the current session state
	 */
	getSessionState(): {
		sessionInitialized: boolean
		hasCsrfToken: boolean
		isInitializing: boolean
		lastInitAttempt: string | null
		lastInitError: unknown
		csrfTokenInStore: boolean
	} {
		// Get the latest state from the session store to ensure accuracy
		const storeState = sessionStore.get();
		
		return {
			sessionInitialized: storeState.initialized,
			hasCsrfToken: this.hasCsrfToken(),
			isInitializing,
			lastInitAttempt: lastInitAttempt ? new Date(lastInitAttempt).toISOString() : null,
			lastInitError,
			csrfTokenInStore: this.checkTokenInStore()
		}
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
	 * Mark a session as initializing
	 * This should be called before making a session initialization API call
	 * @returns A function to call when initialization is complete
	 */
	beginInitialization(): () => void {
		isInitializing = true
		lastInitAttempt = Date.now()
		
		return () => {
			isInitializing = false
			setTimeout(() => {
				initializationPromise = null
			}, MIN_INIT_INTERVAL)
		}
	}

	/**
	 * Check if we should initialize a session
	 * @param forceNew Force a new session even if one exists
	 * @returns Boolean indicating if we should initialize
	 */
	shouldInitialize(forceNew = false): boolean {
		// If forcing a new session, always initialize
		if (forceNew) {
			return true
		}

		// If we're already initializing, don't start another initialization
		if (isInitializing) {
			return false
		}

		// If we already have a token and the session is initialized, don't initialize again
		if (this.hasCsrfToken() && sessionStore.get().initialized) {
			return false
		}

		// If we've attempted initialization recently, don't try again too soon
		if (lastInitAttempt > 0) {
			const timeSinceLastAttempt = Date.now() - lastInitAttempt
			if (timeSinceLastAttempt < MIN_INIT_INTERVAL) {
				return false
			}
		}

		// Otherwise, we should initialize
		return true
	}

	/**
	 * Check if session should be initialized on startup
	 * This is called when the application first loads
	 */
	shouldInitializeOnStartup(): boolean {
		// Don't initialize if we already have a valid token
		if (this.hasCsrfToken() && sessionStore.get().initialized) {
			debugLog('Session already initialized on startup - skipping initialization')
			return false
		}

		// Initialize if we don't have a token or session isn't initialized
		return true
	}

	/**
	 * Initialize a session with the API
	 * @param forceNew Force a new session even if one exists
	 * @returns Promise that resolves to boolean indicating success
	 */
	async initSession(forceNew = false): Promise<boolean> {
		// Check if we should initialize a session
		if (!forceNew && !this.shouldInitialize(forceNew)) {
			debugLog('Session initialization skipped - using existing session')
			return true
		}

		// If there's already an initialization in progress, return that promise
		if (isInitializing && initializationPromise) {
			debugLog('Session initialization already in progress - returning existing promise')
			return initializationPromise
		}

		// Create a new initialization promise
		initializationPromise = this._doInitSession(forceNew)
		return initializationPromise
	}

	/**
	 * Internal method to actually perform session initialization
	 * @param forceNew Force a new session even if one exists
	 * @returns Promise that resolves to boolean indicating success
	 */
	private async _doInitSession(forceNew = false): Promise<boolean> {
		// Mark the session as initializing and get the completion callback
		const completeInit = this.beginInitialization()

		try {
			debugLog('Session Manager: Initializing session with server')

			// Try up to 3 times to initialize the session
			let attempts = 0
			const maxAttempts = 3
			let success = false

			while (attempts < maxAttempts && !success) {
				attempts++

				try {
					if (attempts > 1) {
						debugLog(`Session initialization attempt ${attempts}/${maxAttempts}`)
					}

					// Make request to the session init endpoint
					const response = await _apiClient.initSession()

					// Log the response in development mode
					if (import.meta.env.DEV) {
						console.group('Session Init Response in SessionManager')
						console.log('Response:', response)
						console.groupEnd()
					}

					// If we got a response, try to extract the CSRF token
					if (response) {
						// Try to extract the CSRF token from the response
						// This could be in various places depending on the API implementation
						let csrfToken = null;
						
						// Check if the response is an object
						if (typeof response === 'object' && response !== null) {
							// Try different possible locations for the CSRF token
							if ('csrf_token' in response) {
								csrfToken = (response as any).csrf_token;
							} else if ('token' in response) {
								csrfToken = (response as any).token;
							} else if ('id' in response) {
								// Some APIs use the session ID as the CSRF token
								csrfToken = (response as any).id;
							}
							
							// If we found a token, set it
							if (csrfToken) {
								debugLog('Found CSRF token in session init response');
								this.setCsrfToken(csrfToken);
								success = true;
								break;
							}
						}
					}

					// Check if we now have a CSRF token
					if (this.hasCsrfToken()) {
						success = true;
						break;
					} else {
						// If we still don't have a token, check cookies
						// Some APIs set the CSRF token as a cookie instead of in the response body
						if (typeof document !== 'undefined') {
							const cookies = document.cookie.split(';');
							const csrfCookieNames = apiConfig.csrfCookieNames || ['csrftoken', 'csrf_token'];
							
							// Log all cookies in development mode
							if (import.meta.env.DEV) {
								console.group('Cookies available during session init');
								console.log('All cookies:', document.cookie);
								cookies.forEach(cookie => {
									const [name, value] = cookie.trim().split('=');
									console.log(`Cookie: ${name} = ${value ? value.substring(0, 10) + '...' : 'empty'}`);
								});
								console.groupEnd();
							}
							
							for (const cookie of cookies) {
								const [name, value] = cookie.trim().split('=');
								if (csrfCookieNames.includes(name.toLowerCase()) && value) {
									debugLog(`Found CSRF token in cookies (${name})`);
									this.setCsrfToken(value);
									success = true;
									break;
								}
							}
						}
						
						// If we still don't have a token, try to use the session cookie value as the CSRF token
						// This is a fallback for APIs that use the session ID as the CSRF token
						if (!success && typeof document !== 'undefined') {
							const cookies = document.cookie.split(';');
							const sessionCookieNames = ['trustyconvert_session', 'session_id', 'sessionid'];
							
							for (const cookie of cookies) {
								const [name, value] = cookie.trim().split('=');
								if (sessionCookieNames.includes(name.toLowerCase()) && value) {
									debugLog(`Using session cookie value as CSRF token (${name})`);
									this.setCsrfToken(value);
									success = true;
									break;
								}
							}
						}
						
						// If we still don't have a token, try to create a fallback token
						if (!success && response) {
							// Create a fallback token using a timestamp and random value
							// This is a last resort for development purposes only
							if (import.meta.env.DEV) {
								const fallbackToken = `dev-fallback-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
								debugLog('Creating fallback CSRF token for development');
								this.setCsrfToken(fallbackToken);
								success = true;
							} else {
								debugError(`No CSRF token received (attempt ${attempts}/${maxAttempts})`);
							}
						} else if (!success) {
							debugError(`No CSRF token received (attempt ${attempts}/${maxAttempts})`);
						}
						
						// Short delay before retry
						if (!success && attempts < maxAttempts) {
							await new Promise(resolve => setTimeout(resolve, 500));
						}
					}
				} catch (err) {
					debugError(`Session initialization error (attempt ${attempts}/${maxAttempts}):`, err)
					// Short delay before retry
					if (attempts < maxAttempts) {
						await new Promise(resolve => setTimeout(resolve, 500))
					}
				}
			}

			// Final check if we have a CSRF token
			if (!this.hasCsrfToken()) {
				lastInitError = {
					type: 'MissingToken',
					message: `Session initialization failed after ${attempts} attempts - no CSRF token received in headers`
				}
				debugError(`Session initialization failed after ${attempts} attempts - no CSRF token received`)

				if (import.meta.env.DEV) {
					console.error('Session initialization failed - CSRF token missing')
					console.log('Current session state:', this.getSessionState())
				}

				// Make sure the session store is marked as not initialized
				sessionStore.setKey('initialized', false)
				return false
			}

			// Clear any previous error
			lastInitError = null
			debugLog('Session Manager: Session initialized with CSRF token from server')

			// Mark session as initialized in store
			sessionStore.setKey('initialized', true)

			// Double-check for consistency
			const state = this.getSessionState()
			if (!state.sessionInitialized) {
				debugLog('Warning: Session state inconsistency detected - fixing')
				sessionStore.setKey('initialized', true)
			}

			return true
		} catch (error) {
			lastInitError = error
			debugError('Session Manager: Session initialization failed', error)

			if (import.meta.env.DEV) {
				console.error('Session initialization failed with error:', error)
				console.log('Current session state:', this.getSessionState())
			}

			// Make sure the session store is marked as not initialized
			sessionStore.setKey('initialized', false)
			return false
		} finally {
			completeInit()
		}
	}

	/**
	 * Ensure a valid session exists, with minimal API calls
	 * This should be the primary method used by components
	 */
	async ensureSession(): Promise<boolean> {
		try {
			// First check if we have a token in the store AND session is initialized
			const storeState = sessionStore.get()
			
			// Check if there's an inconsistency between the store and the token
			const hasTokenInStore = this.checkTokenInStore();
			const isStoreInitialized = storeState.initialized;
			
			// Fix inconsistent state: if we have a token but session is not marked as initialized
			if (hasTokenInStore && !isStoreInitialized) {
				debugLog('Session state inconsistency detected: has token but not marked as initialized - fixing');
				sessionStore.setKey('initialized', true);
			}
			
			// After potential fix, check again
			if (this.checkTokenInStore() && sessionStore.get().initialized) {
				debugLog('Session already initialized in ensureSession - no API call needed')

				if (import.meta.env.DEV) {
					debugSessionState(this, 'sessionManager.ensureSession - using existing token')
				}

				return true
			}

			// If no valid session in store, initialize a new session
			debugLog('No valid session in store, attempting to initialize session')

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
					
					// Double-check consistency again
					if (!sessionStore.get().initialized) {
						debugError('Failed to update session initialization status in store');
					}
					
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

		debugLog(`Updating CSRF token from server response: ${token.substring(0, 5)}...`)
		
		// Log the token in development mode
		if (import.meta.env.DEV) {
			console.group('Updating CSRF Token')
			console.log('Token:', `${token.substring(0, 5)}...`)
			console.groupEnd()
		}
		
		return this.setCsrfToken(token)
	}

	/**
	 * Check if a session initialization is currently in progress
	 */
	isInitializationInProgress(): boolean {
		return isInitializing
	}

	/**
	 * Get detailed debug information about the session
	 * Only use this in development mode
	 */
	getDebugInfo() {
		if (import.meta.env.DEV) {
			return {
				sessionState: this.getSessionState(),
				csrfToken: this.getCsrfToken() ? 'exists' : 'none',
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

// Automatically initialize session on client-side load if needed
if (typeof window !== 'undefined') {
	// Use setTimeout to ensure this runs after the initial render
	setTimeout(() => {
		if (sessionManager.shouldInitializeOnStartup()) {
			debugLog('Auto-initializing session on application startup')
			sessionManager.initSession().catch(err => {
				debugError('Failed to auto-initialize session:', err)
			})
		}
	}, 100)
}

export default sessionManager

/**
 * Centralized Session Manager Service
 *
 * This service handles all session initialization and CSRF token management.
 * It ensures that only one session initialization request is made at a time
 * and provides methods for checking and refreshing CSRF tokens.
 */

import { debugLog, debugError } from '@/lib/utils/debug'
import { getCsrfTokenFromCookie, setCsrfTokenCookie } from '@/lib/utils/csrfUtils'
import { initSession as apiInitSession } from '@/lib/api/apiClient'
import { withRetry, RETRY_STRATEGIES } from '@/lib/utils/retry'

// Session state
let isInitializing = false
let lastInitTime = 0
let initializationPromise: Promise<boolean> | null = null
let sessionInitialized = false
let currentCsrfToken: string | null = null
let initAttempts = 0
const MAX_INIT_ATTEMPTS = 3

// Create a debounced version of the initialization function
let debounceTimeout: NodeJS.Timeout | null = null
const DEBOUNCE_DELAY = 300 // ms

/**
 * Check if a CSRF token exists
 * @returns True if a CSRF token exists
 */
export function hasCsrfToken(): boolean {
	const cookieToken = getCsrfTokenFromCookie()
	return cookieToken !== null && cookieToken === currentCsrfToken
}

/**
 * Get the current CSRF token
 * @returns The current CSRF token or null if not found
 */
export function getCsrfToken(): string | null {
	// Always return the in-memory token which should be synchronized with the cookie
	return currentCsrfToken
}

/**
 * Set the CSRF token both in memory and cookie
 * @param token The CSRF token to set
 * @returns True if token was set successfully
 */
async function setCsrfToken(token: string): Promise<boolean> {
	try {
		debugLog('Setting CSRF token:', token)

		// Store in memory first
		currentCsrfToken = token

		// Then set in cookie
		setCsrfTokenCookie(token)

		// Wait a moment for cookie to be set
		await new Promise((resolve) => setTimeout(resolve, 100))

		// Verify token was set correctly
		const cookieToken = getCsrfTokenFromCookie()
		if (cookieToken !== token) {
			debugError('CSRF token mismatch after setting cookie', {
				inMemory: token,
				inCookie: cookieToken
			})

			// Try alternative approach
			if (typeof document !== 'undefined') {
				document.cookie = `csrftoken=${token};path=/;max-age=86400;SameSite=None;Secure`

				// Check again
				await new Promise((resolve) => setTimeout(resolve, 100))
				const retryToken = getCsrfTokenFromCookie()
				if (retryToken !== token) {
					debugError('CSRF token still mismatched after retry', {
						inMemory: token,
						inCookie: retryToken
					})
					return false
				}
			}
		}

		debugLog('CSRF token synchronized successfully')
		return true
	} catch (error) {
		debugError('Error setting CSRF token:', error)
		return false
	}
}

/**
 * Initialize a session with debouncing to prevent multiple calls
 * @returns A promise that resolves to true if initialization was successful
 */
export function debouncedInitSession(): Promise<boolean> {
	// If we already have a valid token, return immediately
	if (hasCsrfToken() && sessionInitialized) {
		return Promise.resolve(true)
	}

	// Return existing promise if initialization is in progress
	if (initializationPromise && isInitializing) {
		return initializationPromise
	}

	// Create a new promise for this debounced call
	return new Promise((resolve) => {
		// Clear any existing timeout
		if (debounceTimeout) {
			clearTimeout(debounceTimeout)
		}

		// Set a new timeout
		debounceTimeout = setTimeout(() => {
			// Start the actual initialization
			initSession().then(resolve)
		}, DEBOUNCE_DELAY)
	})
}

/**
 * Initialize a session
 * This ensures only one initialization request is made at a time
 * @returns A promise that resolves to true if initialization was successful
 */
export async function initSession(): Promise<boolean> {
	// If we already have a valid CSRF token and session is initialized, return true
	if (hasCsrfToken() && sessionInitialized) {
		debugLog('Session already initialized with valid CSRF token')
		return true
	}

	// If there's already an initialization in progress, return that promise
	if (initializationPromise && isInitializing) {
		debugLog('Session initialization already in progress, returning existing promise')
		return initializationPromise
	}

	// Throttle initialization to prevent hammering the API
	const now = Date.now()
	if (now - lastInitTime < 2000) {
		// 2 second throttle
		debugLog('Session initialization throttled')
		if (hasCsrfToken()) {
			return true
		}
		await new Promise((resolve) => setTimeout(resolve, 2000))
	}

	// Start initialization
	isInitializing = true
	lastInitTime = Date.now()
	initAttempts += 1
	debugLog(`Starting session initialization (attempt ${initAttempts})`)

	// Create a new promise for this initialization
	initializationPromise = (async () => {
		try {
			// Call the API to initialize the session with retry logic
			const response = await withRetry(() => apiInitSession(), {
				...RETRY_STRATEGIES.API_REQUEST,
				maxRetries: initAttempts >= MAX_INIT_ATTEMPTS ? 0 : 2, // Limit retries based on overall attempts
				onRetry: (error, attempt) => {
					debugLog(
						`Retrying session initialization (attempt ${attempt}) after error: ${error.message}`
					)
				}
			})

			// Extract CSRF token from response body
			if (response.success && response.data?.csrf_token) {
				debugLog('Received CSRF token from session init:', response.data.csrf_token)

				// Set the token in both memory and cookie
				const tokenSet = await setCsrfToken(response.data.csrf_token)
				if (!tokenSet) {
					debugError('Failed to set CSRF token')
					return false
				}

				sessionInitialized = true
				initAttempts = 0 // Reset attempts counter on success
				return true
			} else {
				debugError('No CSRF token in session init response', response)
				return false
			}
		} catch (error) {
			debugError('Failed to initialize session:', error)
			return false
		} finally {
			isInitializing = false
			initializationPromise = null
		}
	})()

	return initializationPromise
}

/**
 * Reset the session by initializing a new one
 * @returns A promise that resolves to true if reset was successful
 */
export async function resetSession(): Promise<boolean> {
	debugLog('Resetting session')
	sessionInitialized = false
	currentCsrfToken = null
	return initSession()
}

/**
 * Ensure a valid session exists before proceeding
 * @returns A promise that resolves to true if a valid session exists
 */
export async function ensureSession(): Promise<boolean> {
	// First synchronize any existing token from cookie to memory
	synchronizeTokenFromCookie()

	// Only initialize a new session if we don't have a valid token
	if (!hasCsrfToken() || !sessionInitialized) {
		debugLog('No valid session, initializing')
		return initSession()
	}

	debugLog('Valid session already exists')
	return true
}

/**
 * Synchronize the CSRF token from cookie to memory
 * This should be called when there might be external changes to the cookie
 * @returns True if synchronization was successful
 */
export function synchronizeTokenFromCookie(): boolean {
	const cookieToken = getCsrfTokenFromCookie()
	if (cookieToken) {
		currentCsrfToken = cookieToken
		debugLog('Synchronized CSRF token from cookie:', cookieToken)
		return true
	}
	debugError('Failed to synchronize token: No CSRF token in cookie')
	return false
}

/**
 * Get the current session state
 * @returns Object with session state information
 */
export function getSessionState() {
	return {
		isInitialized: sessionInitialized,
		isInitializing,
		hasCsrfToken: hasCsrfToken(),
		initAttempts
	}
}

// Export a default object for convenience
export default {
	initSession,
	debouncedInitSession,
	resetSession,
	ensureSession,
	hasCsrfToken,
	getCsrfToken,
	synchronizeTokenFromCookie,
	getSessionState
}

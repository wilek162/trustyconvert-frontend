/**
 * Session Manager
 *
 * Centralized module for managing API session state.
 * This handles session initialization, status tracking, and cleanup.
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
	setInitializationError
} from '@/lib/stores/session'

// Track initialization at the module level to prevent race conditions
let isInitializing = false
let initializationPromise: Promise<void> | null = null

/**
 * Initialize the API session
 * This should be called once during application startup
 *
 * @returns Promise that resolves when initialization is complete
 */
export async function initializeApiSession(): Promise<void> {
	// If already initialized, just return
	if (getInitialized()) {
		return Promise.resolve()
	}

	// If initialization is already in progress, return the existing promise
	if (isInitializing && initializationPromise) {
		return initializationPromise
	}

	// Set initializing state
	isInitializing = true
	setInitializing(true)

	// Create a new initialization promise
	initializationPromise = (async () => {
		try {
			// First check if we already have a token in the cookie
			if (hasCsrfToken()) {
				syncCsrfTokenFromCookie()
				return
			}

			// Initialize the session - this will cause the server to set a cookie
			// The apiClient.initSession() function now handles duplicate calls gracefully
			const response = await apiClient.initSession()

			// If the API returned a CSRF token directly, store it
			if (response && response.data && response.data.csrf_token) {
				setCSRFToken(response.data.csrf_token, response.data.id, response.data.expires_at)
			} else {
				// Otherwise try to get it from the cookie
				syncCsrfTokenFromCookie()
			}
		} catch (error) {
			// Record the error
			const errorMessage = error instanceof Error ? error.message : String(error)
			setInitializationError(errorMessage)
			console.error('Session initialization error:', errorMessage)
			// We don't rethrow the error here to prevent unhandled promise rejections
		} finally {
			// Reset initialization state
			isInitializing = false
			setInitializing(false)
		}
	})()

	return initializationPromise
}

/**
 * Reset the session state and initialize a new session
 *
 * @returns Promise that resolves when initialization is complete
 */
export async function resetApiSession(): Promise<void> {
	// Clear the current session state
	clearSession()

	// Reset the initialization flag
	isInitializing = false
	initializationPromise = null

	// Initialize a new session
	return initializeApiSession()
}

/**
 * Close the current API session
 * This should be called when the user is done with the application
 *
 * @returns Promise that resolves when the session is closed
 */
export async function closeApiSession(): Promise<void> {
	try {
		await apiClient.closeSession()
		clearSession()
		isInitializing = false
		initializationPromise = null
	} catch (error) {
		console.error('Failed to close API session:', error)
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
		isInitialized: state.isInitialized || hasCsrfToken(),
		isInitializing: state.isInitializing || isInitializing,
		hasError: !!state.lastInitializationError,
		error: state.lastInitializationError,
		attempts: state.initializationAttempts
	}
}

// Export a singleton instance for use throughout the application
export const sessionManager = {
	initialize: initializeApiSession,
	reset: resetApiSession,
	close: closeApiSession,
	getState: getSessionState
}

export default sessionManager

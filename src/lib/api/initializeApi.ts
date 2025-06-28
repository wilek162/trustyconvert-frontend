/**
 * API Initialization Module
 *
 * This module initializes the API session at application startup.
 * It should be imported once at the root level of the application.
 */

import { sessionManager } from './sessionManager'

// Track if we've already attempted initialization
let hasAttemptedInitialization = false

// Initialize the API session immediately when this module is imported
// but only once, even if the module is imported multiple times
if (!hasAttemptedInitialization) {
	hasAttemptedInitialization = true

	// We use a self-invoking async function to properly handle errors
	;(async () => {
		try {
			await sessionManager.initialize()
			console.log('API session initialized successfully')
		} catch (error) {
			console.error('Failed to initialize API session:', error)
			// We don't rethrow the error to prevent unhandled promise rejection
		}
	})()
}

/**
 * This function can be called to explicitly initialize the API session
 * It's useful for server-side rendering or when you need to ensure the session
 * is initialized before rendering the application
 */
export async function initializeApi(): Promise<void> {
	return sessionManager.initialize()
}

export default initializeApi

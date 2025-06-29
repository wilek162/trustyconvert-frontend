/**
 * API Initialization Module
 *
 * This module initializes the API session at application startup.
 * It should be imported once at the root level of the application.
 *
 * Features:
 * - Automatic session initialization when imported
 * - Periodic session refresh checks
 * - Graceful error handling
 */

import { sessionManager } from './sessionManager'
import { debugLog, debugError } from '@/lib/utils/debug'

// Track if we've already attempted initialization
let hasAttemptedInitialization = false
let sessionRefreshInterval: ReturnType<typeof setInterval> | null = null

// Session refresh interval (check every 5 minutes)
const SESSION_REFRESH_INTERVAL = 5 * 60 * 1000

/**
 * Set up periodic session refresh checks
 * This ensures the session remains valid during long user sessions
 */
function setupSessionRefreshChecks(): void {
	// Clear any existing interval
	if (sessionRefreshInterval) {
		clearInterval(sessionRefreshInterval)
	}

	// Set up a new interval to check session validity periodically
	sessionRefreshInterval = setInterval(() => {
		sessionManager.checkRefresh().catch((error) => {
			debugError('Error during periodic session refresh check', error)
		})
	}, SESSION_REFRESH_INTERVAL)

	// Add event listener for page visibility changes to check session when user returns
	if (typeof document !== 'undefined') {
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'visible') {
				debugLog('Page became visible, checking session validity')
				sessionManager.checkRefresh().catch((error) => {
					debugError('Error checking session on visibility change', error)
				})
			}
		})
	}
}

// Initialize the API session immediately when this module is imported
// but only once, even if the module is imported multiple times
if (!hasAttemptedInitialization) {
	hasAttemptedInitialization = true

	// We use a self-invoking async function to properly handle errors
	;(async () => {
		try {
			await sessionManager.initialize()
			debugLog('API session initialized successfully')

			// Set up periodic session refresh checks
			setupSessionRefreshChecks()
		} catch (error) {
			debugError('Failed to initialize API session', error)
			// We don't rethrow the error to prevent unhandled promise rejection
		}
	})()
}

/**
 * This function can be called to explicitly initialize the API session
 * It's useful for server-side rendering or when you need to ensure the session
 * is initialized before rendering the application
 *
 * @param forceNew Force creation of a new session even if one exists
 * @returns Promise that resolves when initialization is complete
 */
export async function initializeApi(forceNew = false): Promise<void> {
	try {
		await sessionManager.initialize(forceNew)

		// Set up periodic session refresh checks if not already set up
		if (!sessionRefreshInterval) {
			setupSessionRefreshChecks()
		}

		return
	} catch (error) {
		debugError('Failed to explicitly initialize API session', error)
		throw error // Rethrow for explicit calls so caller can handle
	}
}

/**
 * Clean up API resources
 * Call this when the application is shutting down or when the user is navigating away
 */
export function cleanupApi(): void {
	// Clear the session refresh interval
	if (sessionRefreshInterval) {
		clearInterval(sessionRefreshInterval)
		sessionRefreshInterval = null
	}

	// No need to await here as we're cleaning up
	sessionManager.close().catch((error) => {
		debugError('Error during API cleanup', error)
	})
}

export default initializeApi

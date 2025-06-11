/**
 * Application Initialization
 *
 * This module serves as the central initialization point for the application.
 * It initializes monitoring, mocks, and any other services needed at startup.
 */

import { initializeMonitoring, initializeMocks, reportError } from './monitoring'

/**
 * Initialize the application
 * This function should be called as early as possible in the application lifecycle
 */
export async function initializeApp() {
	try {
		// Initialize monitoring first to catch any errors
		await initializeMonitoring()

		// Initialize API mocks in development
		if (import.meta.env.DEV) {
			await initializeMocks()
		}

		// Log initialization success
		console.log('Application initialized successfully')
	} catch (error) {
		console.error('Failed to initialize application:', error)
		// Use a simple console log since monitoring might not be initialized
		console.error(error instanceof Error ? error : String(error), {
			context: 'app-init'
		})
	}
}

/**
 * Initialize browser-specific features
 * This function should only run in the browser environment
 */
export function initializeBrowser() {
	if (typeof window === 'undefined') {
		return
	}

	try {
		// Set up global error handler
		window.addEventListener('error', (event) => {
			reportError(event.error || new Error(event.message), {
				context: 'window.onerror',
				url: event.filename,
				line: event.lineno,
				column: event.colno
			})
		})

		// Set up unhandled promise rejection handler
		window.addEventListener('unhandledrejection', (event) => {
			reportError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)), {
				context: 'unhandledrejection'
			})
		})

		// Log browser initialization success
		console.log('Browser features initialized')
	} catch (error) {
		console.error('Failed to initialize browser features:', error)
		reportError(error instanceof Error ? error : String(error), {
			context: 'browser-init'
		})
	}
}

// Only auto-initialize in browser environment if not imported by Astro
// This prevents double initialization
if (typeof window !== 'undefined' && !import.meta.env.SSR) {
	// Use requestIdleCallback when available, otherwise use setTimeout
	const scheduleInit = window.requestIdleCallback || setTimeout

	scheduleInit(
		() => {
			initializeApp()
				.then(initializeBrowser)
				.catch((err) => {
					console.error('Failed to auto-initialize app:', err)
				})
		},
		{ timeout: 1000 }
	)
}

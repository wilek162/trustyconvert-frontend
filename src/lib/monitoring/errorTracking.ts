/**
 * Error tracking module
 * Handles the initialization and configuration of error tracking
 */

// Remove static import to fix SSR issues
// import * as Sentry from "@sentry/browser";

/**
 * Initialize error tracking
 * This is a legacy function and is kept for backward compatibility
 * New code should use the functions in init.ts
 */
export const initErrorTracking = async () => {
	// Skip initialization in SSR context
	if (typeof window === 'undefined') {
		return
	}

	try {
		if (import.meta.env.PROD) {
			const Sentry = await import('@sentry/browser')

			Sentry.init({
				dsn: import.meta.env.PUBLIC_SENTRY_DSN,
				environment: import.meta.env.PUBLIC_ENVIRONMENT || 'production',
				tracesSampleRate: 0.1,
				integrations: [new Sentry.BrowserTracing()]
			})
		}
	} catch (error) {
		console.warn('Failed to initialize error tracking:', error)
	}
}

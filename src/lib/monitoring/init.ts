/**
 * Monitoring initialization module
 * Provides error tracking and performance monitoring abstractions
 */

// Removed static import to fix SSR issues
import { measurePerformance } from './performance'

/**
 * Error tracking interface
 * This allows us to easily swap out error tracking implementations
 */
interface ErrorTracker {
	captureException(error: Error): void
	captureMessage(message: string, level?: 'info' | 'warning' | 'error'): void
	setTag(key: string, value: string): void
	setUser(user: { id?: string; [key: string]: any } | null): void
}

/**
 * Console-based error tracker implementation
 * Used in development environment
 */
class ConsoleErrorTracker implements ErrorTracker {
	captureException(error: Error): void {
		console.error('[ErrorTracker]', error)
	}

	captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
		const method = level === 'info' ? 'log' : level
		console[method]('[ErrorTracker]', message)
	}

	setTag(key: string, value: string): void {
		console.log('[ErrorTracker] Set tag', key, value)
	}

	setUser(user: { id?: string; [key: string]: any } | null): void {
		console.log('[ErrorTracker] Set user', user)
	}
}

/**
 * Global error tracker instance
 */
let errorTracker: ErrorTracker = new ConsoleErrorTracker()

/**
 * Get the current error tracker instance
 */
export function getErrorTracker(): ErrorTracker {
	return errorTracker
}

/**
 * Initialize Sentry error tracking (only in browser, only when needed)
 */
async function initializeSentry(dsn: string, environment: string): Promise<ErrorTracker> {
	// Only load Sentry in the browser
	if (typeof window === 'undefined') {
		return new ConsoleErrorTracker()
	}

	try {
		// Dynamically import Sentry only when needed
		const Sentry = await import('@sentry/browser')

		Sentry.init({
			dsn,
			environment,
			tracesSampleRate: 0.1,
			integrations: [
				new Sentry.BrowserTracing({
					tracePropagationTargets: ['localhost', 'trustyconvert.com']
				})
			]
		})

		// Return Sentry implementation of ErrorTracker
		return {
			captureException(error: Error): void {
				Sentry.captureException(error)
			},
			captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
				Sentry.captureMessage(message, level)
			},
			setTag(key: string, value: string): void {
				Sentry.setTag(key, value)
			},
			setUser(user: { id?: string; [key: string]: any } | null): void {
				Sentry.setUser(user)
			}
		}
	} catch (error) {
		console.warn('Failed to initialize Sentry:', error)
		return new ConsoleErrorTracker()
	}
}

/**
 * Initialize error tracking and performance monitoring
 */
export async function initializeMonitoring(): Promise<void> {
	try {
		// Initialize error tracking based on environment
		if (import.meta.env.PROD && typeof window !== 'undefined') {
			const dsn = import.meta.env.PUBLIC_SENTRY_DSN

			if (dsn) {
				errorTracker = await initializeSentry(
					dsn,
					import.meta.env.PUBLIC_ENVIRONMENT || 'production'
				)
			} else {
				console.warn('Sentry DSN not provided. Falling back to console error tracking.')
				errorTracker = new ConsoleErrorTracker()
			}
		} else {
			// Use console tracker in development
			errorTracker = new ConsoleErrorTracker()
		}

		// Set application info
		errorTracker.setTag('app.version', import.meta.env.PUBLIC_APP_VERSION || '0.0.1')

		// Initialize performance monitoring in browser environment
		if (typeof window !== 'undefined') {
			measurePerformance()
		}
	} catch (error) {
		console.error('Failed to initialize monitoring:', error)

		// Ensure we always have a working error tracker
		errorTracker = new ConsoleErrorTracker()
	}
}

/**
 * Initialize MSW for API mocking in development
 *
 * NOTE: MSW has been disabled in favor of using the real API.
 * This function is kept for backward compatibility but no longer initializes MSW.
 */
export async function initializeMocks(): Promise<any> {
	// MSW initialization has been disabled to use the real API
	console.log('Mock Service Worker (MSW) has been disabled. Using real API endpoints.')
	return Promise.resolve()
}

/**
 * Report an error to the error tracker
 */
export function reportError(error: Error | string, context?: Record<string, any>): void {
	if (typeof error === 'string') {
		errorTracker.captureMessage(error, 'error')
	} else {
		errorTracker.captureException(error)
	}

	if (context) {
		Object.entries(context).forEach(([key, value]) => {
			errorTracker.setTag(key, String(value))
		})
	}
}

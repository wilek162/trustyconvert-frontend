/**
 * Global Error Handler
 *
 * Provides centralized error handling for uncaught exceptions and promise rejections.
 * Integrates with monitoring systems and provides user feedback when appropriate.
 */

import { reportError } from '@/lib/monitoring/init'
import { showToast } from '@/components/providers/ToastListener'

/**
 * Initialize global error handlers for uncaught exceptions and unhandled promise rejections
 */
export function initGlobalErrorHandlers(): void {
	if (typeof window === 'undefined') return

	// Handle uncaught exceptions
	window.addEventListener('error', (event) => {
		handleGlobalError(event.error || new Error(event.message), {
			type: 'uncaught-exception',
			filename: event.filename,
			lineno: event.lineno,
			colno: event.colno
		})

		// Don't prevent default behavior
		return false
	})

	// Handle unhandled promise rejections
	window.addEventListener('unhandledrejection', (event) => {
		const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason))

		handleGlobalError(error, {
			type: 'unhandled-rejection',
			promise: event.promise
		})

		// Don't prevent default behavior
		return false
	})

	// Log initialization in development
	if (import.meta.env.DEV) {
		console.log('Global error handlers initialized')
	}
}

/**
 * Handle a global error by reporting it and showing user feedback when appropriate
 *
 * @param error - The error that occurred
 * @param context - Additional context about the error
 */
function handleGlobalError(error: Error, context: Record<string, any>): void {
	// Report error to monitoring service
	reportError(error, {
		...context,
		globalHandler: true,
		url: window.location.href,
		timestamp: new Date().toISOString()
	})

	// Log error in development
	if (import.meta.env.DEV) {
		console.error('[Global Error]:', error)
		console.error('Context:', context)
	}

	// Show user feedback for client-side errors
	// Only show for production and not for expected errors
	if (!import.meta.env.DEV && shouldShowUserFeedback(error)) {
		showToast('Something went wrong. Please try again or refresh the page.', 'error', 10000)
	}
}

/**
 * Determine if user feedback should be shown for an error
 *
 * @param error - The error to evaluate
 * @returns Whether to show user feedback
 */
function shouldShowUserFeedback(error: Error): boolean {
	// Don't show feedback for network errors (handled elsewhere)
	if (
		error.name === 'NetworkError' ||
		error.message.includes('network') ||
		error.message.includes('fetch')
	) {
		return false
	}

	// Don't show for script load errors (often caused by ad blockers)
	if (error.message.includes('script') && error.message.includes('load')) {
		return false
	}

	// Show feedback for all other errors
	return true
}

/**
 * Wrap a function with error handling
 *
 * @param fn - Function to wrap
 * @param errorHandler - Custom error handler
 * @returns Wrapped function that won't throw
 */
export function withErrorHandling<T extends (...args: any[]) => any>(
	fn: T,
	errorHandler?: (error: unknown) => void
): (...args: Parameters<T>) => ReturnType<T> | undefined {
	return (...args: Parameters<T>): ReturnType<T> | undefined => {
		try {
			const result = fn(...args)

			// Handle promise results
			if (result instanceof Promise) {
				return result.catch((error) => {
					if (errorHandler) {
						errorHandler(error)
					} else {
						handleGlobalError(error instanceof Error ? error : new Error(String(error)), {
							source: fn.name || 'anonymous function'
						})
					}
					return undefined
				}) as ReturnType<T>
			}

			return result
		} catch (error) {
			if (errorHandler) {
				errorHandler(error)
			} else {
				handleGlobalError(error instanceof Error ? error : new Error(String(error)), {
					source: fn.name || 'anonymous function'
				})
			}
			return undefined
		}
	}
}

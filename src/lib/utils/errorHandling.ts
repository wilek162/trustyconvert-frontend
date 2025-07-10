/**
 * DEPRECATED SERVICE. DO NOT USE
 * Centralized Error Handling Utilities
 *
 * Provides a unified approach to error handling across the application,
 * including error classification, formatting, logging, and user feedback.
 */

import { reportError } from '@/lib/monitoring/init'
import { showError, showWarning, MESSAGE_TEMPLATES, formatMessage } from '@/lib/utils/messageUtils'
import {
	ApiError,
	ConversionError,
	NetworkError,
	SessionError,
	ValidationError
} from '@/lib/errors/error-types'

// Re-export error types for convenience
export {
	ApiError,
	ConversionError,
	NetworkError,
	SessionError,
	ValidationError
} from '@/lib/errors/error-types'

/**
 * Error context for additional information
 */
export interface ErrorContext {
	/** Component or module where the error occurred */
	component?: string

	/** Action being performed when the error occurred */
	action?: string

	/** Additional context-specific information */
	[key: string]: any
}

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
		showError(MESSAGE_TEMPLATES.generic.error, {
			duration: 10000
		})
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

/**
 * Format an error for user display
 *
 * @param error - Error to format
 * @returns User-friendly error message
 */
export function formatErrorForUser(error: unknown): string {
	if (error instanceof ApiError) {
		return error.message || MESSAGE_TEMPLATES.generic.serverError
	}

	if (error instanceof NetworkError) {
		return MESSAGE_TEMPLATES.generic.networkError
	}

	if (error instanceof ValidationError) {
		return error.message || 'Validation error'
	}

	if (error instanceof ConversionError) {
		return error.message || MESSAGE_TEMPLATES.conversion.failed
	}

	if (error instanceof SessionError) {
		return error.message || MESSAGE_TEMPLATES.session.invalid
	}

	if (error instanceof Error) {
		return error.message || MESSAGE_TEMPLATES.generic.error
	}

	return MESSAGE_TEMPLATES.generic.error
}

/**
 * Log an error with context
 *
 * @param error - Error to log
 * @param context - Additional context
 */
export function logError(error: unknown, context: ErrorContext = {}): void {
	// In development, log to console with detailed info
	if (import.meta.env.DEV) {
		console.group('Application Error')
		console.error(error)

		if (context) {
			console.log('Error Context:', context)
		}

		console.groupEnd()
	}

	// In production, send to monitoring service
	reportError(error instanceof Error ? error : new Error(String(error)), context)
}

/**
 * Handle an error with consistent logging and user feedback
 *
 * @param error - The error to handle
 * @param options - Error handling options
 * @returns Formatted error message for user
 */
export function handleError(
	error: unknown,
	options: {
		context?: ErrorContext
		showToast?: boolean
		rethrow?: boolean
		severity?: 'error' | 'warning'
	} = {}
): string {
	// Log the error
	logError(error, options.context || {})

	// Format for user display
	const userMessage = formatErrorForUser(error)

	// In development mode, show more detailed errors
	const displayMessage = import.meta.env.DEV
		? getDetailedErrorMessage(error, userMessage)
		: userMessage

	// Show toast if requested
	if (options.showToast) {
		if (options.severity === 'warning') {
			showWarning(displayMessage, {
				duration: 8000,
				dismissible: true
			})
		} else {
			showError(displayMessage, {
				duration: 10000,
				dismissible: true
			})
		}
	}

	// Rethrow if requested
	if (options.rethrow && error instanceof Error) {
		throw error
	}

	return displayMessage
}

/**
 * Get a more detailed error message for development mode
 */
function getDetailedErrorMessage(error: unknown, defaultMessage: string): string {
	if (!import.meta.env.DEV) {
		return defaultMessage
	}

	if (error instanceof SessionError) {
		return `Session Error: ${error.message} (${JSON.stringify(error.context)})`
	}

	if (error instanceof NetworkError) {
		return `Network Error: ${error.message} (${JSON.stringify(error.context)})`
	}

	if (error instanceof ApiError) {
		return `API Error: ${error.message} (Status: ${error.statusCode}, Code: ${error.code})`
	}

	if (error instanceof Error) {
		return `${error.name}: ${error.message}${error.stack ? '\n' + error.stack.split('\n')[1] : ''}`
	}

	return defaultMessage
}

/**
 * Get the appropriate message template for an error type
 *
 * @param error - The error object
 * @returns The appropriate message template
 */
export function getErrorMessageTemplate(error: unknown): string {
	if (error instanceof ApiError) {
		return MESSAGE_TEMPLATES.generic.serverError
	}

	if (error instanceof NetworkError) {
		return MESSAGE_TEMPLATES.generic.networkError
	}

	if (error instanceof ValidationError) {
		return MESSAGE_TEMPLATES.upload.invalidType
	}

	if (error instanceof ConversionError) {
		return MESSAGE_TEMPLATES.conversion.failed
	}

	if (error instanceof SessionError) {
		return MESSAGE_TEMPLATES.session.invalid
	}

	return MESSAGE_TEMPLATES.generic.error
}

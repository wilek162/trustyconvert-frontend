/**
 * Centralized error handling utilities
 *
 * This module provides consistent error handling across the application
 * with support for user-friendly messages and error reporting.
 */

import { getErrorTracker, reportError } from '@/lib/monitoring/init'

/**
 * Application error types for consistent categorization
 */
export enum ErrorType {
	NETWORK = 'network',
	VALIDATION = 'validation',
	CONVERSION = 'conversion',
	AUTHENTICATION = 'authentication',
	PERMISSION = 'permission',
	UNEXPECTED = 'unexpected',
	SESSION = 'session'
}

/**
 * Application error with type and user-friendly message
 */
export class AppError extends Error {
	type: ErrorType
	userMessage: string
	originalError?: Error
	context?: Record<string, any>

	constructor(options: {
		message: string
		userMessage?: string
		type?: ErrorType
		originalError?: Error
		context?: Record<string, any>
	}) {
		super(options.message)
		this.name = 'AppError'
		this.type = options.type || ErrorType.UNEXPECTED
		this.userMessage = options.userMessage || 'An unexpected error occurred. Please try again.'
		this.originalError = options.originalError
		this.context = options.context

		// Capture stack trace
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, AppError)
		}
	}
}

/**
 * Network error for API call failures
 */
export class NetworkError extends AppError {
	constructor(options: {
		message: string
		userMessage?: string
		originalError?: Error
		context?: Record<string, any>
	}) {
		super({
			...options,
			type: ErrorType.NETWORK,
			userMessage:
				options.userMessage || 'Network error. Please check your connection and try again.'
		})
		this.name = 'NetworkError'
	}
}

/**
 * Validation error for input validation failures
 */
export class ValidationError extends AppError {
	fieldErrors?: Record<string, string>

	constructor(options: {
		message: string
		userMessage?: string
		fieldErrors?: Record<string, string>
		context?: Record<string, any>
	}) {
		super({
			...options,
			type: ErrorType.VALIDATION,
			userMessage: options.userMessage || 'Please check your input and try again.'
		})
		this.name = 'ValidationError'
		this.fieldErrors = options.fieldErrors
	}
}

/**
 * Session error for session-related failures
 */
export class SessionError extends AppError {
	constructor(options: {
		message: string
		userMessage?: string
		originalError?: Error
		context?: Record<string, any>
	}) {
		super({
			...options,
			type: ErrorType.SESSION,
			userMessage: options.userMessage || 'Your session has expired. Please refresh the page.'
		})
		this.name = 'SessionError'
	}
}

/**
 * Handle an error with consistent reporting and logging
 *
 * @param error - The error to handle
 * @param options - Additional options for error handling
 * @returns User-friendly error message
 */
export function handleError(
	error: unknown,
	options: {
		context?: Record<string, any>
		silent?: boolean
	} = {}
): string {
	// Extract error information
	const appError = asAppError(error)

	// Report error unless silent
	if (!options.silent) {
		reportError(appError, {
			...appError.context,
			...options.context
		})
	}

	// Log error in development
	if (import.meta.env.DEV) {
		console.error('[Error]', appError)
		if (appError.originalError) {
			console.error('[Original Error]', appError.originalError)
		}
	}

	// Return user-friendly message
	return appError.userMessage
}

/**
 * Convert any error to an AppError for consistent handling
 */
function asAppError(error: unknown): AppError {
	// Already an AppError
	if (error instanceof AppError) {
		return error
	}

	// Standard Error
	if (error instanceof Error) {
		return new AppError({
			message: error.message,
			originalError: error
		})
	}

	// String error
	if (typeof error === 'string') {
		return new AppError({
			message: error
		})
	}

	// Unknown error
	return new AppError({
		message: 'Unknown error occurred',
		context: { unknownError: error }
	})
}

/**
 * Create a safe async function wrapper that catches errors
 *
 * @param fn - Async function to wrap
 * @param errorHandler - Custom error handler
 * @returns Wrapped function that won't throw
 */
export function createSafeAsyncFunction<T, Args extends any[]>(
	fn: (...args: Args) => Promise<T>,
	errorHandler?: (error: unknown) => void
): (...args: Args) => Promise<T | null> {
	return async (...args: Args): Promise<T | null> => {
		try {
			return await fn(...args)
		} catch (error) {
			if (errorHandler) {
				errorHandler(error)
			} else {
				handleError(error)
			}
			return null
		}
	}
}

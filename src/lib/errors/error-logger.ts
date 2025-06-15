/**
 * Error Logger
 *
 * Centralized error logging utility that can be configured to send errors
 * to various monitoring services like Sentry, or fallback to console.
 */

import type { ApiError, ConversionError } from './error-types'

type LoggerOptions = {
	componentStack?: string
	context?: Record<string, any>
}

// Error logging service
class ErrorLogger {
	private static instance: ErrorLogger
	private readonly isDevelopment = import.meta.env.DEV

	private constructor() {}

	static getInstance(): ErrorLogger {
		if (!ErrorLogger.instance) {
			ErrorLogger.instance = new ErrorLogger()
		}
		return ErrorLogger.instance
	}

	/**
	 * Log an error with optional context
	 */
	logError(error: Error, options: LoggerOptions = {}) {
		// In development, log to console with detailed info
		if (this.isDevelopment) {
			console.group('Application Error')
			console.error(error)

			if (options.componentStack) {
				console.error('Component Stack:', options.componentStack)
			}

			if (options.context) {
				console.log('Error Context:', options.context)
			}

			console.groupEnd()
		}

		// In production, we would send to monitoring service
		// For example, with Sentry:
		// if (import.meta.env.PROD && window.Sentry) {
		//   window.Sentry.captureException(error, {
		//     extra: {
		//       componentStack: options.componentStack,
		//       ...options.context
		//     }
		//   });
		// }
	}

	logApiError(error: ApiError): void {
		this.logError(error, {
			statusCode: error.statusCode,
			code: error.code,
			details: error.details
		})
	}

	logConversionError(error: ConversionError): void {
		this.logError(error, {
			taskId: error.taskId,
			status: error.status
		})
	}
}

export const errorLogger = ErrorLogger.getInstance()

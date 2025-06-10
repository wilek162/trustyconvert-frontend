/**
 * Error handling utilities
 */

export class AppError extends Error {
	constructor(
		message: string,
		public code: string,
		public status: number = 500,
		public details?: Record<string, any>
	) {
		super(message)
		this.name = 'AppError'
	}
}

export class ValidationError extends AppError {
	constructor(message: string, details?: Record<string, any>) {
		super(message, 'VALIDATION_ERROR', 400, details)
		this.name = 'ValidationError'
	}
}

export class NetworkError extends AppError {
	constructor(message: string = 'Network error occurred') {
		super(message, 'NETWORK_ERROR', 0)
		this.name = 'NetworkError'
	}
}

export class ConversionError extends AppError {
	constructor(message: string, details?: Record<string, any>) {
		super(message, 'CONVERSION_ERROR', 500, details)
		this.name = 'ConversionError'
	}
}

export class DownloadError extends AppError {
	constructor(message: string, details?: Record<string, any>) {
		super(message, 'DOWNLOAD_ERROR', 500, details)
		this.name = 'DownloadError'
	}
}

export class SessionError extends AppError {
	constructor(message: string, details?: Record<string, any>) {
		super(message, 'SESSION_ERROR', 401, details)
		this.name = 'SessionError'
	}
}

export function handleError(error: unknown): AppError {
	if (error instanceof AppError) {
		return error
	}

	if (error instanceof Error) {
		return new AppError(error.message, 'UNKNOWN_ERROR')
	}

	return new AppError('An unknown error occurred', 'UNKNOWN_ERROR')
}

export function isAppError(error: unknown): error is AppError {
	return error instanceof AppError
}

export function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message
	}
	return 'An unknown error occurred'
}

export function getErrorCode(error: unknown): string {
	if (isAppError(error)) {
		return error.code
	}
	return 'UNKNOWN_ERROR'
}

export function getErrorStatus(error: unknown): number {
	if (isAppError(error)) {
		return error.status
	}
	return 500
}

export function getErrorDetails(error: unknown): Record<string, any> | undefined {
	if (isAppError(error)) {
		return error.details
	}
	return undefined
}

export function formatError(error: unknown): {
	message: string
	code: string
	status: number
	details?: Record<string, any>
} {
	return {
		message: getErrorMessage(error),
		code: getErrorCode(error),
		status: getErrorStatus(error),
		details: getErrorDetails(error)
	}
}

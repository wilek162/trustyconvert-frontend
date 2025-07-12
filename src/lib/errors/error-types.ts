// Custom error types for better error handling
export class ApiError extends Error {
	constructor(
		message: string,
		public statusCode: number,
		public code: string,
		public details?: unknown
	) {
		super(message)
		this.name = 'ApiError'
	}
}

export class NetworkError extends Error {
	context: Record<string, any>

	constructor(message = 'Network error occurred', context: Record<string, any> = {}) {
		super(message)
		this.name = 'NetworkError'
		this.context = context
	}
}

export class ServerError extends Error {
	context: Record<string, any>

	constructor(message = 'Server error occurred', context: Record<string, any> = {}) {
		super(message)
		this.name = 'ServerError'
		this.context = context
	}
}

export class ValidationError extends Error {
	constructor(
		message: string,
		public field?: string
	) {
		super(message)
		this.name = 'ValidationError'
	}
}

export class ConversionError extends Error {
	constructor(
		message: string,
		public taskId?: string,
		public status?: string
	) {
		super(message)
		this.name = 'ConversionError'
	}
}

/**
 * Session-related errors
 */
export class SessionError extends Error {
	context: Record<string, any>

	constructor(message = 'Session error', context: Record<string, any> = {}) {
		super(message)
		this.name = 'SessionError'
		this.context = context
	}
}

/**
 * Download-related errors
 */
export class DownloadError extends Error {
	context: Record<string, any>

	constructor(message = 'Download error', context: Record<string, any> = {}) {
		super(message)
		this.name = 'DownloadError'
		this.context = context
	}
}

/**
 * Upload-related errors
 */
export class UploadError extends Error {
	context: Record<string, any>

	constructor(message = 'Upload error', context: Record<string, any> = {}) {
		super(message)
		this.name = 'UploadError'
		this.context = context
	}
}

/**
 * Storage-related errors
 */
export class StorageError extends Error {
	context: Record<string, any>

	constructor(message = 'Storage error', context: Record<string, any> = {}) {
		super(message)
		this.name = 'StorageError'
		this.context = context
	}
}

/**
 * Format-related errors
 */
export class FormatError extends Error {
	constructor(
		message = 'Format error',
		public format?: string
	) {
		super(message)
		this.name = 'FormatError'
	}
}

/**
 * Explicitly retryable error
 * Use this to mark errors that should be retried
 */
export class RetryableError extends Error {
	context: Record<string, any>
	
	constructor(
		message: string, 
		public originalError?: Error,
		context: Record<string, any> = {}
	) {
		super(message)
		this.name = 'RetryableError'
		this.context = {
			...context,
			originalError: originalError?.toString()
		}
	}
}

/**
 * Client-side errors (not server related)
 * These are typically not retryable
 */
export class ClientError extends Error {
	context: Record<string, any>

	constructor(message: string, context: Record<string, any> = {}) {
		super(message)
		this.name = 'ClientError'
		this.context = context
	}
}

/**
 * A utility function to check if an error is retryable
 * This centralizes retry logic to be consistent
 */
export function isRetryableError(error: unknown): boolean {
	// RetryableError is always retryable
	if (error instanceof RetryableError) {
		return true
	}
	
	// Network errors are generally retryable
	if (error instanceof NetworkError) {
		return true
	}
	
	// Some API errors are retryable based on status code
	if (error instanceof ApiError) {
		// 408 Request Timeout, 429 Too Many Requests, 5xx Server Errors
		const retryableStatusCodes = [408, 429, 500, 502, 503, 504]
		return retryableStatusCodes.includes(error.statusCode)
	}
	
	// Session errors might be retryable if they're due to expiration
	if (error instanceof SessionError) {
		return error.message.includes('expired') || 
			   error.message.includes('invalid') || 
			   error.message.includes('timeout')
	}

	// Download errors are generally retryable
	if (error instanceof DownloadError) {
		return true
	}

	// Upload errors are generally retryable
	if (error instanceof UploadError) {
		return true
	}

	// Storage errors might be retryable
	if (error instanceof StorageError) {
		return true
	}

	// Format errors are not retryable
	if (error instanceof FormatError) {
		return false
	}
	
	// Check for fetch/network-like errors (DOMExceptions, etc.)
	if (error instanceof Error) {
		// Check for network-related errors
		if (
			error.name === 'NetworkError' ||
			error.name === 'AbortError' ||
			error.name === 'TimeoutError' ||
			error.message.includes('network') ||
			error.message.includes('timeout') ||
			error.message.includes('connection')
		) {
			return true
		}
	}
	
	// By default, don't retry
	return false
}

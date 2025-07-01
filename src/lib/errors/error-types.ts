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

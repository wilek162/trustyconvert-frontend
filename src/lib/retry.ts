/**
 * Advanced Retry Utility
 *
 * Provides retry functionality with exponential backoff for async operations,
 * with configurable retry counts, delays, and conditions.
 */

/**
 * Options for retry configuration
 */
export interface RetryOptions {
	/** Maximum number of retry attempts */
	maxRetries?: number

	/** Initial delay in milliseconds */
	initialDelay?: number

	/** Maximum delay in milliseconds */
	maxDelay?: number

	/** Backoff factor for exponential delay calculation */
	backoffFactor?: number

	/** Jitter factor to add randomness to delay (0-1) */
	jitter?: number

	/** Function to determine if an error should trigger a retry */
	retryCondition?: (error: unknown, attempt: number) => boolean

	/** Function called before each retry attempt */
	onRetry?: (error: unknown, attempt: number, delay: number) => void

	/** Function called when all retries are exhausted */
	onExhausted?: (error: unknown, attempts: number) => void
}

/**
 * Default retry options
 */
const DEFAULT_OPTIONS: Required<RetryOptions> = {
	maxRetries: 3,
	initialDelay: 300,
	maxDelay: 30000,
	backoffFactor: 2,
	jitter: 0.25,
	retryCondition: () => true,
	onRetry: () => {},
	onExhausted: () => {}
}

/**
 * Calculate delay with exponential backoff and jitter
 *
 * @param attempt - Current attempt number (0-based)
 * @param options - Retry options
 * @returns Delay in milliseconds
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
	// Calculate exponential backoff
	const exponentialDelay = options.initialDelay * Math.pow(options.backoffFactor, attempt)

	// Apply maximum delay limit
	const cappedDelay = Math.min(exponentialDelay, options.maxDelay)

	// Apply jitter to prevent thundering herd problem
	const jitterAmount = cappedDelay * options.jitter
	const min = Math.max(0, cappedDelay - jitterAmount)
	const max = cappedDelay + jitterAmount

	return min + Math.random() * (max - min)
}

/**
 * Sleep for a specified duration
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Execute an async function with retry capability
 *
 * @param fn - Async function to execute with retry
 * @param options - Retry configuration options
 * @returns Promise with the function result
 * @throws Last error encountered after all retries are exhausted
 */
export async function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
	// Merge provided options with defaults
	const config = { ...DEFAULT_OPTIONS, ...options } as Required<RetryOptions>

	let lastError: unknown

	// Try initial attempt plus retries
	for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
		try {
			// Execute the function
			return await fn()
		} catch (error) {
			lastError = error

			// Check if we should retry
			const isLastAttempt = attempt === config.maxRetries
			const shouldRetry = !isLastAttempt && config.retryCondition(error, attempt)

			if (!shouldRetry) {
				if (isLastAttempt) {
					config.onExhausted(error, attempt + 1)
				}
				throw error
			}

			// Calculate delay for next attempt
			const delay = calculateDelay(attempt, config)

			// Call onRetry callback
			config.onRetry(error, attempt + 1, delay)

			// Wait before next attempt
			await sleep(delay)
		}
	}

	// This should never happen due to the loop structure,
	// but TypeScript requires a return value
	throw lastError
}

/**
 * Create a retryable version of an async function
 *
 * @param fn - Original async function
 * @param options - Retry configuration options
 * @returns Wrapped function with retry capability
 */
export function createRetryable<T extends (...args: any[]) => Promise<any>>(
	fn: T,
	options?: RetryOptions
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
	return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
		return withRetry(() => fn(...args), options)
	}
}

/**
 * Check if an error is retryable based on common patterns
 *
 * @param error - Error to check
 * @returns Whether the error should trigger a retry
 */
export function isRetryableError(error: unknown): boolean {
	// Network errors are typically retryable
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

	// Check for HTTP status codes that are typically retryable
	if (error && typeof error === 'object' && 'status' in error) {
		const status = (error as { status: number }).status

		// 408 Request Timeout, 429 Too Many Requests, 5xx Server Errors
		return status === 408 || status === 429 || (status >= 500 && status < 600)
	}

	return false
}

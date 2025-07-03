/**
 * Retry Utility
 *
 * A centralized utility for handling retries with configurable strategies.
 */

// Default retry configuration
export interface RetryConfig {
	/** Maximum number of retry attempts */
	maxRetries: number

	/** Initial delay in milliseconds */
	initialDelay: number

	/** Maximum delay in milliseconds */
	maxDelay: number

	/** Backoff factor (1 = linear, 2 = exponential) */
	backoffFactor: number

	/** Jitter factor to add randomness to delay (0-1) */
	jitter?: number

	/** Function to determine if an error is retryable */
	isRetryable?: (error: unknown) => boolean

	/** Callback function for retry attempts */
	onRetry?: (error: unknown, attempt: number, delay: number) => void

	/** Callback when all retries are exhausted */
	onExhausted?: (error: unknown, attempts: number) => void
}

// Default configuration
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
	maxRetries: 3,
	initialDelay: 300,
	maxDelay: 10000,
	backoffFactor: 2,
	jitter: 0.25,
	isRetryable: () => true, // By default, retry all errors
	onRetry: (error, attempt) => {
		if (import.meta.env.DEV) {
			console.warn(
				`Retry attempt ${attempt} after error:`,
				error instanceof Error ? error.message : String(error)
			)
		}
	}
}

// Different retry strategies for different use cases
export const RETRY_STRATEGIES = {
	// For API requests (fewer retries, faster backoff)
	API_REQUEST: {
		...DEFAULT_RETRY_CONFIG,
		maxRetries: 3,
		initialDelay: 300,
		backoffFactor: 3
	},

	// For critical operations (more retries, slower backoff)
	CRITICAL: {
		...DEFAULT_RETRY_CONFIG,
		maxRetries: 5,
		initialDelay: 500,
		backoffFactor: 2
	},

	// For background operations (many retries, slow backoff)
	BACKGROUND: {
		...DEFAULT_RETRY_CONFIG,
		maxRetries: 10,
		initialDelay: 1000,
		backoffFactor: 1.5
	},

	// For status polling (many attempts with fixed interval)
	POLLING: {
		...DEFAULT_RETRY_CONFIG,
		maxRetries: 60, // 5 minutes at 5-second intervals
		initialDelay: 5000,
		backoffFactor: 1, // Linear (no backoff)
		jitter: 0.1 // Small jitter for polling
	}
}

/**
 * Calculate delay for the next retry attempt with optional jitter
 *
 * @param attempt - Current attempt number (0-based)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
export function calculateBackoff(attempt: number, config: RetryConfig): number {
	const { initialDelay, maxDelay, backoffFactor, jitter = 0 } = config

	// Calculate base delay with exponential backoff
	const baseDelay = initialDelay * Math.pow(backoffFactor, attempt)
	const cappedDelay = Math.min(baseDelay, maxDelay)

	// Apply jitter if specified to prevent thundering herd problem
	if (jitter > 0) {
		const jitterAmount = cappedDelay * jitter
		const min = Math.max(0, cappedDelay - jitterAmount)
		const max = cappedDelay + jitterAmount
		return min + Math.random() * (max - min)
	}

	return cappedDelay
}

/**
 * Sleep for a specified duration
 * @param ms - Milliseconds to sleep
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Execute a function with retry logic
 *
 * @param fn - Function to execute
 * @param config - Retry configuration
 * @returns Promise with the function result
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	config: Partial<RetryConfig> = {}
): Promise<T> {
	// Merge with default config
	const fullConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
	const { maxRetries, isRetryable, onRetry, onExhausted } = fullConfig

	let lastError: unknown = null

	// Try initial attempt plus retries
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn()
		} catch (error) {
			lastError = error

			// Check if we should retry
			const isLastAttempt = attempt >= maxRetries
			const shouldRetry = !isLastAttempt && (isRetryable ? isRetryable(error) : true)

			if (!shouldRetry) {
				if (isLastAttempt && onExhausted) {
					onExhausted(error, attempt + 1)
				}
				break
			}

			// Calculate delay for next attempt
			const delay = calculateBackoff(attempt, fullConfig)

			// Call retry callback
			if (onRetry) {
				onRetry(error, attempt + 1, delay)
			}

			// Wait before next attempt
			await sleep(delay)
		}
	}

	// If we get here, all attempts failed
	throw lastError || new Error('All retry attempts failed')
}

/**
 * Create a retryable version of a function
 *
 * @param fn - Function to make retryable
 * @param config - Retry configuration
 * @returns Retryable function
 */
export function createRetryable<T extends (...args: any[]) => Promise<any>>(
	fn: T,
	config: Partial<RetryConfig> = {}
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
	return (...args: Parameters<T>): Promise<ReturnType<T>> => {
		return withRetry(() => fn(...args), config) as Promise<ReturnType<T>>
	}
}

/**
 * Determine if an error is likely to be resolved by retrying
 *
 * @param error - Error to check
 * @returns True if the error is retryable
 */
export function isRetryableError(error: unknown): boolean {
	// Network errors are generally retryable
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

	// By default, don't retry
	return false
}

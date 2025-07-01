/**
 * @deprecated This file is deprecated. Please use '@/lib/utils/retry.ts' instead.
 * This file will be removed in a future release.
 */

import {
	withRetry as utilsWithRetry,
	createRetryable as utilsCreateRetryable,
	isRetryableError as utilsIsRetryableError,
	type RetryConfig,
	DEFAULT_RETRY_CONFIG,
	RETRY_STRATEGIES,
	calculateBackoff
} from '@/lib/utils/retry'

// Re-export everything from the new location
export {
	withRetry,
	createRetryable,
	isRetryableError,
	type RetryConfig,
	DEFAULT_RETRY_CONFIG,
	RETRY_STRATEGIES,
	calculateBackoff
}

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

// Export the functions with deprecation warnings
export async function withRetry<T>(
	fn: () => Promise<T>,
	options?: Partial<RetryConfig>
): Promise<T> {
	console.warn(
		'Warning: Using deprecated retry.ts module. Please import from @/lib/utils/retry instead.'
	)
	return utilsWithRetry(fn, options)
}

export function createRetryable<T extends (...args: any[]) => Promise<any>>(
	fn: T,
	options?: Partial<RetryConfig>
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
	console.warn(
		'Warning: Using deprecated retry.ts module. Please import from @/lib/utils/retry instead.'
	)
	return utilsCreateRetryable(fn, options)
}

export function isRetryableError(error: unknown): boolean {
	console.warn(
		'Warning: Using deprecated retry.ts module. Please import from @/lib/utils/retry instead.'
	)
	return utilsIsRetryableError(error)
}

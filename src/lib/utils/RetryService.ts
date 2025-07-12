// Remove duplicate implementations and standardize on RetryService
// In src/lib/utils.ts
/**
 * Enhanced Retry Service
 *
 * A centralized service for handling retry logic across the application.
 * This service provides configurable retry strategies, adaptive backoff,
 * circuit breaker patterns, and integrates with error handling and monitoring.
 */

import { debugLog, debugError } from '@/lib/utils/debug'
import { reportError } from '@/lib/monitoring/init'
import { isRetryableError, RetryableError } from '@/lib/errors/error-types'
import { handleError } from '@/lib/errors/ErrorHandlingService'
import { toastService } from '@/lib/services/toastService'
import { MESSAGE_TEMPLATES } from '@/lib/constants/messages'

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
  
	/** Endpoint identifier for circuit breaker */
	endpoint?: string
  
	/** Whether to show toast notifications on retries */
	showToastOnRetry?: boolean
  
	/** Context metadata for error reporting */
	context?: Record<string, any>
  
	/** Whether to use adaptive backoff based on response times */
	useAdaptiveBackoff?: boolean
  
	/** Whether to use circuit breaker pattern */
	useCircuitBreaker?: boolean
  
	/** Circuit breaker failure threshold */
	circuitBreakerThreshold?: number
  
	/** Circuit breaker reset timeout in ms */
	circuitBreakerResetTimeout?: number
}

// Default configuration
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
	maxRetries: 3,
	initialDelay: 300,
	maxDelay: 10000,
	backoffFactor: 2,
	jitter: 0.25,
	isRetryable: isRetryableError,
	showToastOnRetry: false,
	useAdaptiveBackoff: true,
	useCircuitBreaker: true,
	circuitBreakerThreshold: 5,
	circuitBreakerResetTimeout: 60000,
	onRetry: (error, attempt, delay) => {
		debugLog(
			`Retry attempt ${attempt} after error:`,
			error instanceof Error ? error.message : String(error)
		)
	}
}

// Different retry strategies for different use cases
export const RETRY_STRATEGIES = {
	// For API requests (fewer retries, faster backoff)
	API_REQUEST: {
		...DEFAULT_RETRY_CONFIG,
		maxRetries: 3,
		initialDelay: 300,
		backoffFactor: 3,
		useCircuitBreaker: true,
		circuitBreakerThreshold: 3
	},

	// For critical operations (more retries, slower backoff)
	CRITICAL: {
		...DEFAULT_RETRY_CONFIG,
		maxRetries: 5,
		initialDelay: 500,
		backoffFactor: 2,
		useCircuitBreaker: true,
		circuitBreakerThreshold: 5,
		showToastOnRetry: true
	},

	// For background operations (many retries, slow backoff)
	BACKGROUND: {
		...DEFAULT_RETRY_CONFIG,
		maxRetries: 10,
		initialDelay: 1000,
		backoffFactor: 1.5,
		useCircuitBreaker: false
	},

	// For status polling (many attempts with fixed interval)
	POLLING: {
		...DEFAULT_RETRY_CONFIG,
		maxRetries: 20,
		initialDelay: 5000,
		backoffFactor: 1,
		jitter: 0.1,
		useCircuitBreaker: false,
		useAdaptiveBackoff: false
	},
  
	// For user-facing operations (fewer retries, very fast initial retry)
	USER_FACING: {
		...DEFAULT_RETRY_CONFIG,
		maxRetries: 2,
		initialDelay: 200,
		showToastOnRetry: true,
		useCircuitBreaker: true,
		circuitBreakerThreshold: 2
	},
  
	// For session operations (moderate retries, fast backoff)
	SESSION: {
		...DEFAULT_RETRY_CONFIG,
		maxRetries: 3,
		initialDelay: 250,
		backoffFactor: 2,
		useCircuitBreaker: true,
		circuitBreakerThreshold: 3,
		showToastOnRetry: false
	},
  
	// For download operations (fewer retries, longer delays)
	DOWNLOAD: {
		...DEFAULT_RETRY_CONFIG,
		maxRetries: 2,
		initialDelay: 1000,
		backoffFactor: 2,
		useCircuitBreaker: true,
		circuitBreakerThreshold: 2,
		showToastOnRetry: true
	}
}

// Circuit breaker state management
interface CircuitBreakerState {
	failures: number
	lastFailure: number
	status: 'closed' | 'open' | 'half-open'
	nextAttempt?: number
	resetTimeout: number
}

/**
 * Singleton RetryService class
 */
class RetryService {
	private static instance: RetryService
  
	// Circuit breaker state by endpoint
	private circuitBreakers: Map<string, CircuitBreakerState> = new Map()
  
	// Operation metrics
	private metrics: Map<string, {
		attempts: number
		successes: number
		failures: number
		lastAttempt: number
		avgResponseTime: number
	}> = new Map()
  
	private constructor() {
		// Initialize metrics cleanup interval
		setInterval(() => this.cleanupMetrics(), 3600000) // Clean up every hour
	}
  
	/**
	 * Get singleton instance
	 */
	public static getInstance(): RetryService {
		if (!RetryService.instance) {
			RetryService.instance = new RetryService()
		}
		return RetryService.instance
	}
  
	/**
	 * Execute a function with retry logic
	 */
	public async withRetry<T>(
		fn: () => Promise<T>,
		config: Partial<RetryConfig> = {}
	): Promise<T> {
		// Merge with default config
		const fullConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
		const { 
			maxRetries, 
			isRetryable = isRetryableError, 
			onRetry, 
			onExhausted, 
			endpoint,
			context = {}
		} = fullConfig

		// Check circuit breaker status if endpoint is provided
		if (endpoint && this.isCircuitOpen(endpoint)) {
			throw new Error(`Circuit breaker open for endpoint: ${endpoint}`)
		}

		let lastError: unknown = null
		let metadata = { endpoint, operation: fn.name || 'anonymous' }

		// Try initial attempt plus retries
		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				// Record attempt in metrics
				if (endpoint) {
					this.recordAttempt(endpoint)
				}

				// Execute the function
				const result = await fn()

				// Record success in metrics and close circuit if needed
				if (endpoint) {
					this.recordSuccess(endpoint)
				}

				return result
			} catch (error) {
				lastError = error

				// Record metrics for the error
				if (endpoint) {
					this.recordFailure(endpoint)
				}

				// Report the error to monitoring with attempt information
				this.reportRetryError(error, attempt, maxRetries, metadata)

				// Check if we should retry
				const isLastAttempt = attempt >= maxRetries
				const shouldRetry = !isLastAttempt && isRetryable(error)

				if (!shouldRetry) {
					if (isLastAttempt && onExhausted) {
						onExhausted(error, attempt + 1)
					}
          
					// If it's a circuit breaker endpoint and we've exhausted retries, open the circuit
					if (endpoint && isLastAttempt) {
						this.openCircuit(endpoint)
					}
          
					break
				}

				// Calculate delay for next attempt
				const delay = this.calculateBackoff(attempt, fullConfig)

				// Call retry callback
				if (onRetry) {
					onRetry(error, attempt + 1, delay)
				}

				// Show toast if configured
				if (fullConfig.showToastOnRetry) {
					const retryMessage = `Retrying operation (attempt ${attempt + 1}/${maxRetries})...`
					await handleError(error, {
						severity: 'info',
						showToast: true,
						context: {
							...context,
							retryAttempt: attempt + 1,
							maxRetries,
							...metadata
						}
					})
				} else {
					// Just log the error without showing toast
					debugError(`Retry attempt ${attempt + 1}/${maxRetries} after error:`, error)
				}

				// Wait before next attempt
				await this.sleep(delay)
			}
		}

		// If we get here, all attempts failed
		// Handle the error with our error handling service
		const errorResult = await handleError(lastError, {
			showToast: true,
			severity: 'error',
			context: {
				...context,
				retriesExhausted: true,
				maxRetries,
				...metadata
			}
		})
    
		throw lastError || new Error('All retry attempts failed')
	}
  
	/**
	 * Create a retryable version of a function
	 */
	public createRetryable<T extends (...args: any[]) => Promise<any>>(
		fn: T,
		config: Partial<RetryConfig> = {}
	): (...args: Parameters<T>) => Promise<ReturnType<T>> {
		return (...args: Parameters<T>): Promise<ReturnType<T>> => {
			return this.withRetry(() => fn(...args), config) as Promise<ReturnType<T>>
		}
	}
  
	/**
	 * Calculate delay for the next retry attempt with optional jitter
	 */
	private calculateBackoff(attempt: number, config: RetryConfig): number {
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
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms))
	}
  
	/**
	 * Check if circuit breaker is open for endpoint
	 */
	private isCircuitOpen(endpoint: string): boolean {
		const state = this.circuitBreakers.get(endpoint)
    
		if (!state) return false
    
		if (state.status === 'open') {
			// Check if we should try half-open
			const now = Date.now()
			if (state.nextAttempt && now >= state.nextAttempt) {
				// Transition to half-open
				this.setCircuitStatus(endpoint, 'half-open')
				return false
			}
			return true
		}
    
		return false
	}
  
	/**
	 * Open the circuit breaker for an endpoint
	 */
	private openCircuit(endpoint: string): void {
		const now = Date.now()
		const state = this.circuitBreakers.get(endpoint) || {
			failures: 0,
			lastFailure: now,
			status: 'closed',
			resetTimeout: Date.now() + (this.circuitBreakers.get(endpoint)?.resetTimeout || DEFAULT_RETRY_CONFIG.circuitBreakerResetTimeout || 60000)
		}
    
		// Increase failure count
		state.failures++
		state.lastFailure = now
    
		// If we have multiple recent failures, open the circuit
		if (state.failures >= (this.circuitBreakers.get(endpoint)?.circuitBreakerThreshold || DEFAULT_RETRY_CONFIG.circuitBreakerThreshold || 5)) {
			this.setCircuitStatus(endpoint, 'open')
			// Set a cool-down period (e.g., 30 seconds)
			state.nextAttempt = now + (this.circuitBreakers.get(endpoint)?.resetTimeout || DEFAULT_RETRY_CONFIG.circuitBreakerResetTimeout || 60000)
			debugLog(`Circuit breaker opened for ${endpoint} until ${new Date(state.nextAttempt).toISOString()}`)
		}
    
		this.circuitBreakers.set(endpoint, state)
	}
  
	/**
	 * Set circuit breaker status
	 */
	private setCircuitStatus(endpoint: string, status: 'closed' | 'open' | 'half-open'): void {
		const state = this.circuitBreakers.get(endpoint) || {
			failures: 0,
			lastFailure: Date.now(),
			status: 'closed',
			resetTimeout: Date.now() + (this.circuitBreakers.get(endpoint)?.resetTimeout || DEFAULT_RETRY_CONFIG.circuitBreakerResetTimeout || 60000)
		}
    
		state.status = status
    
		// If closing the circuit, reset failure count
		if (status === 'closed') {
			state.failures = 0
		}
    
		this.circuitBreakers.set(endpoint, state)
		debugLog(`Circuit breaker for ${endpoint} is now ${status}`)
	}
  
	/**
	 * Record metrics for retry attempt
	 */
	private recordAttempt(endpoint: string): void {
		const now = Date.now()
		const metric = this.metrics.get(endpoint) || {
			attempts: 0,
			successes: 0,
			failures: 0,
			lastAttempt: now,
			avgResponseTime: 0
		}
    
		metric.attempts++
		metric.lastAttempt = now
		this.metrics.set(endpoint, metric)
	}
  
	/**
	 * Record successful operation for metrics
	 */
	private recordSuccess(endpoint: string): void {
		const metric = this.metrics.get(endpoint)
		if (!metric) return
    
		metric.successes++
    
		// If we had a successful operation in half-open state, close the circuit
		const state = this.circuitBreakers.get(endpoint)
		if (state && state.status === 'half-open') {
			this.setCircuitStatus(endpoint, 'closed')
		}
	}
  
	/**
	 * Record failed operation for metrics
	 */
	private recordFailure(endpoint: string): void {
		const metric = this.metrics.get(endpoint)
		if (!metric) return
    
		metric.failures++
    
		// If we had a failure in half-open state, reopen the circuit
		const state = this.circuitBreakers.get(endpoint)
		if (state && state.status === 'half-open') {
			this.openCircuit(endpoint)
		}
	}
  
	/**
	 * Report retry error to monitoring
	 */
	private reportRetryError(
		error: unknown, 
		attempt: number, 
		maxRetries: number, 
		metadata: Record<string, any>
	): void {
		// Only report non-first attempts to avoid duplicate reports
		if (attempt > 0) {
			const retryData = {
				...metadata,
				retryAttempt: attempt,
				maxRetries,
				isLastAttempt: attempt >= maxRetries
			}
      
			reportError(error instanceof Error ? error : new Error(String(error)), retryData)
		}
	}
  
	/**
	 * Reset circuit breakers (useful for testing)
	 */
	public resetCircuitBreakers(): void {
		this.circuitBreakers.clear()
	}
  
	/**
	 * Get metrics for all monitored endpoints
	 */
	public getMetrics(): Record<string, {
		attempts: number
		successes: number
		failures: number
		successRate: number
		lastAttempt: Date
		circuitStatus?: string
	}> {
		const result: Record<string, any> = {}
    
		this.metrics.forEach((metric, endpoint) => {
			const circuitState = this.circuitBreakers.get(endpoint)
			const successRate = metric.attempts > 0 
				? (metric.successes / metric.attempts) * 100 
				: 0
      
			result[endpoint] = {
				...metric,
				lastAttempt: new Date(metric.lastAttempt),
				successRate: parseFloat(successRate.toFixed(1)),
				circuitStatus: circuitState?.status
			}
		})
    
		return result
	}

	/**
	 * Clean up old metrics
	 */
	private cleanupMetrics(): void {
		const now = Date.now()
		this.metrics.forEach((metric, endpoint) => {
			if (metric.lastAttempt < now - 3600000) { // Remove metrics older than 1 hour
				this.metrics.delete(endpoint)
			}
		})
	}
}

// Export singleton instance
export const retryService = RetryService.getInstance()

// Export convenience functions
export async function withRetry<T>(
	fn: () => Promise<T>,
	config: Partial<RetryConfig> = {}
): Promise<T> {
	return retryService.withRetry(fn, config)
}

export function createRetryable<T extends (...args: any[]) => Promise<any>>(
	fn: T,
	config: Partial<RetryConfig> = {}
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
	return retryService.createRetryable(fn, config)
} 
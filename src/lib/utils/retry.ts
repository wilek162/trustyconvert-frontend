/**
 * Retry Utility
 * 
 * A centralized utility for handling retries with configurable strategies.
 */

// Default retry configuration
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  
  /** Initial delay in milliseconds */
  initialDelay: number;
  
  /** Maximum delay in milliseconds */
  maxDelay: number;
  
  /** Backoff factor (1 = linear, 2 = exponential) */
  backoffFactor: number;
  
  /** Function to determine if an error is retryable */
  isRetryable?: (error: Error) => boolean;
  
  /** Callback function for retry attempts */
  onRetry?: (error: Error, attempt: number) => void;
}

// Default configuration
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 300,
  maxDelay: 10000,
  backoffFactor: 2,
  isRetryable: () => true, // By default, retry all errors
  onRetry: (error, attempt) => {
    console.warn(`Retry attempt ${attempt} after error:`, error.message);
  }
};

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
    backoffFactor: 1 // Linear (no backoff)
  }
};

/**
 * Calculate delay for the next retry attempt
 * 
 * @param attempt - Current attempt number (0-based)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
export function calculateBackoff(attempt: number, config: RetryConfig): number {
  const { initialDelay, maxDelay, backoffFactor } = config;
  const delay = initialDelay * Math.pow(backoffFactor, attempt);
  return Math.min(delay, maxDelay);
}

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
  const fullConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const { maxRetries, isRetryable, onRetry } = fullConfig;
  
  let lastError: Error | null = null;
  
  // Try initial attempt plus retries
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const typedError = error instanceof Error ? error : new Error(String(error));
      lastError = typedError;
      
      // Check if we should retry
      const shouldRetry = attempt < maxRetries && 
        (isRetryable ? isRetryable(typedError) : true);
      
      if (!shouldRetry) {
        break;
      }
      
      // Call retry callback
      if (onRetry) {
        onRetry(typedError, attempt + 1);
      }
      
      // Wait before next attempt
      const delay = calculateBackoff(attempt, fullConfig);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // If we get here, all attempts failed
  throw lastError || new Error('All retry attempts failed');
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
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    return withRetry(() => fn(...args), config) as ReturnType<T>;
  }) as T;
}

/**
 * Determine if an error is likely to be resolved by retrying
 * 
 * @param error - Error to check
 * @returns True if the error is retryable
 */
export function isRetryableError(error: Error): boolean {
  // Network errors are generally retryable
  if (
    error.name === 'NetworkError' || 
    error.message.includes('network') ||
    error.message.includes('timeout') ||
    error.message.includes('connection')
  ) {
    return true;
  }
  
  // Don't retry client errors (4xx) except for 429 (too many requests)
  if (error.name === 'ApiError') {
    const statusCode = (error as any).status;
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      return statusCode === 429;
    }
  }
  
  // Server errors (5xx) are generally retryable
  if (error.name === 'ApiError') {
    const statusCode = (error as any).status;
    if (statusCode && statusCode >= 500) {
      return true;
    }
  }
  
  // By default, don't retry
  return false;
}

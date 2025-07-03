/**
 * Error and Retry Integration Utility
 * 
 * This module combines error handling and retry logic to provide
 * a unified approach to resilient operations with proper user feedback.
 */

import { handleError, withErrorHandling, type ErrorContext } from '@/lib/errors/errorHandlingService'
import { withRetry, RETRY_STRATEGIES, type RetryConfig } from '@/lib/utils/retry'
import { debugLog } from '@/lib/utils/debug'

/**
 * Combined options for error handling and retry
 */
export interface ErrorRetryOptions {
  // Error handling options
  showToast?: boolean
  rethrow?: boolean
  severity?: 'error' | 'warning' | 'info'
  
  // Retry options
  retryStrategy?: keyof typeof RETRY_STRATEGIES
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  
  // Context information
  component?: string
  action?: string
  
  // Additional context
  [key: string]: any
}

/**
 * Execute a function with combined error handling and retry logic
 * 
 * @param fn Function to execute
 * @param options Combined error and retry options
 * @returns Promise with the function result
 */
export async function withErrorRetry<T>(
  fn: () => Promise<T>,
  options: ErrorRetryOptions = {}
): Promise<T | undefined> {
  // Extract retry-specific options
  const {
    retryStrategy = 'API_REQUEST',
    maxRetries,
    initialDelay,
    maxDelay,
    showToast = true,
    rethrow = false,
    severity = 'error',
    ...contextInfo
  } = options;
  
  // Get the retry strategy configuration
  const strategyConfig = RETRY_STRATEGIES[retryStrategy];
  
  // Create retry configuration
  const retryConfig: Partial<RetryConfig> = {
    maxRetries: maxRetries ?? strategyConfig.maxRetries,
    initialDelay: initialDelay ?? strategyConfig.initialDelay,
    maxDelay: maxDelay ?? strategyConfig.maxDelay,
    backoffFactor: strategyConfig.backoffFactor,
    jitter: strategyConfig.jitter,
    
    // Track retry attempts for the error handler
    onRetry: (error, attempt, delay) => {
      debugLog(`Retry attempt ${attempt} after ${delay}ms delay`, { error });
      
      // Show toast only on first retry if enabled
      if (showToast && attempt === 1) {
        handleError(error, {
          context: {
            ...contextInfo,
            retryCount: attempt - 1,
            maxRetries: maxRetries ?? strategyConfig.maxRetries,
            retryStrategy,
            recoverable: true
          },
          showToast: true,
          severity: 'warning',
          rethrow: false
        });
      }
    },
    
    // When all retries are exhausted
    onExhausted: async (error, attempts) => {
      debugLog(`All ${attempts} retry attempts exhausted`, { error });
      
      // Final error handling with toast
      await handleError(error, {
        context: {
          ...contextInfo,
          retryCount: attempts - 1,
          maxRetries: maxRetries ?? strategyConfig.maxRetries,
          retryStrategy,
          recoverable: false
        },
        showToast,
        severity,
        rethrow
      });
    }
  };
  
  try {
    // Execute with retry logic
    return await withRetry(fn, retryConfig);
  } catch (error) {
    // This will be reached if rethrow is true in onExhausted
    if (rethrow) {
      throw error;
    }
    return undefined;
  }
}

/**
 * Create a function wrapped with error handling and retry logic
 * 
 * @param fn Function to wrap
 * @param options Combined error and retry options
 * @returns Wrapped function
 */
export function createErrorRetryFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: ErrorRetryOptions = {}
): (...args: Parameters<T>) => Promise<ReturnType<T> | undefined> {
  return (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
    return withErrorRetry(() => fn(...args), options) as Promise<ReturnType<T> | undefined>;
  };
}

/**
 * Create a function that retries only on specific error types
 * 
 * @param fn Function to wrap
 * @param errorTypes Array of error type names to retry on
 * @param options Combined error and retry options
 * @returns Wrapped function
 */
export function createTypedErrorRetryFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorTypes: string[],
  options: ErrorRetryOptions = {}
): (...args: Parameters<T>) => Promise<ReturnType<T> | undefined> {
  return (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
    const customOptions = {
      ...options,
      isRetryable: (error: unknown) => {
        if (error instanceof Error) {
          return errorTypes.includes(error.name);
        }
        return false;
      }
    };
    
    return withErrorRetry(() => fn(...args), customOptions) as Promise<ReturnType<T> | undefined>;
  };
} 
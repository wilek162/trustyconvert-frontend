import { errorLogger } from "@/lib/errors/error-logger";
import type { APIRequestError } from "@/lib/api/client";

interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  shouldRetry?: (error: Error | APIRequestError) => boolean;
  onRetry?: (
    error: Error | APIRequestError,
    attempt: number,
    delay: number
  ) => void;
}

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  shouldRetry: (error) => {
    // Retry on network errors or 5xx server errors
    if (error instanceof Error && error.name === "NetworkError") {
      return true;
    }
    if ("code" in error && typeof error.code === "string") {
      return error.code.startsWith("5");
    }
    return false;
  },
  onRetry: (error, attempt, delay) => {
    // Log retry attempt
    errorLogger.logError(error, {
      attempt,
      maxAttempts: defaultOptions.maxAttempts,
      delay,
      willRetry: true,
    });
  },
};

/**
 * Utility function to retry a function with exponential backoff
 * @param fn Function to retry
 * @param options Retry options
 * @returns Promise that resolves with the function result
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let attempt = 0;
  let delay = opts.initialDelay;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      const shouldRetry =
        attempt < opts.maxAttempts &&
        opts.shouldRetry(error as Error | APIRequestError);

      if (!shouldRetry) {
        throw error;
      }

      // Call onRetry callback
      opts.onRetry(error as Error | APIRequestError, attempt, delay);

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * opts.backoffFactor, opts.maxDelay);
    }
  }
}

/**
 * Higher-order function that adds retry capability to any async function
 * @param fn Function to wrap with retry capability
 * @param options Retry options
 * @returns Function with retry capability
 */
export function retryable<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return (async (...args: Parameters<T>) => {
    return withRetry(() => fn(...args), options);
  }) as T;
}

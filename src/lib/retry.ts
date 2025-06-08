import { errorLogger } from "@/lib/errors/error-logger";

interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  shouldRetry?: (error: Error) => boolean;
}

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  shouldRetry: (error) => {
    // Retry on network errors or 5xx server errors
    return (
      error.name === "NetworkError" ||
      (error.name === "ApiError" && (error as any).statusCode >= 500)
    );
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
        attempt < opts.maxAttempts && opts.shouldRetry(error as Error);

      if (!shouldRetry) {
        throw error;
      }

      // Log retry attempt
      errorLogger.logError(error as Error, {
        attempt,
        maxAttempts: opts.maxAttempts,
        delay,
        willRetry: true,
      });

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

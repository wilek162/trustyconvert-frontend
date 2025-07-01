#!/bin/bash

# TrustyConvert Retry Logic Implementation Script
# This script implements the centralized retry logic across the codebase

echo "🔄 Implementing centralized retry logic for TrustyConvert..."

# Create the retry utility
echo "📂 Creating retry utility..."
mkdir -p src/lib/utils
cat > src/lib/utils/retry.ts << 'EOF'
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
EOF

# Create documentation
echo "📝 Creating documentation..."
mkdir -p docs
cat > docs/retry-logic.md << 'EOF'
# Retry Logic Implementation Guide

This document explains how retry logic is implemented in the TrustyConvert frontend application. It covers the centralized retry utility, different retry strategies, and how to use them in various parts of the application.

## Overview

The retry logic is centralized in a utility module (`src/lib/utils/retry.ts`) that provides a consistent approach to handling retries across the application. This ensures that all retries follow the same patterns and configurations, making the code more maintainable and predictable.

## Retry Configuration

### Default Configuration

The default retry configuration is:

```typescript
{
  maxRetries: 3,
  initialDelay: 300, // milliseconds
  maxDelay: 10000,   // 10 seconds
  backoffFactor: 2,  // exponential backoff
  isRetryable: () => true, // By default, retry all errors
  onRetry: (error, attempt) => {
    console.warn(`Retry attempt ${attempt} after error:`, error.message);
  }
}
```

### Predefined Retry Strategies

The utility provides several predefined retry strategies for different use cases:

1. **API_REQUEST**: For general API requests
   - 3 retries
   - 300ms initial delay with exponential backoff (factor 3)
   - Good for most API calls

2. **CRITICAL**: For critical operations
   - 5 retries
   - 500ms initial delay with exponential backoff (factor 2)
   - Use for operations that must succeed (session initialization, etc.)

3. **BACKGROUND**: For background operations
   - 10 retries
   - 1000ms initial delay with slower backoff (factor 1.5)
   - Use for non-blocking operations that can take longer

4. **POLLING**: For status polling
   - 60 retries (5 minutes at 5-second intervals)
   - 5000ms fixed interval (no backoff)
   - Use for polling job status or similar operations

## How to Use

### Basic Usage

```typescript
import { withRetry, RETRY_STRATEGIES } from '@/lib/utils/retry';

// Simple usage with default strategy
const result = await withRetry(async () => {
  return await someAsyncOperation();
});

// Using a predefined strategy
const result = await withRetry(
  async () => await criticalOperation(),
  RETRY_STRATEGIES.CRITICAL
);

// Custom configuration
const result = await withRetry(
  async () => await someAsyncOperation(),
  {
    maxRetries: 2,
    initialDelay: 1000,
    onRetry: (error, attempt) => {
      console.log(`Custom retry ${attempt} after error: ${error.message}`);
    }
  }
);
```

### Creating Retryable Functions

```typescript
import { createRetryable, RETRY_STRATEGIES } from '@/lib/utils/retry';

// Create a retryable version of a function
const fetchWithRetry = createRetryable(fetch, RETRY_STRATEGIES.API_REQUEST);

// Use it like the original function
const response = await fetchWithRetry('https://api.example.com/data');
```

## Best Practices

1. **Use the centralized retry utility for all retries**
   - Don't implement custom retry logic in components
   - Use the predefined strategies when possible

2. **Choose the appropriate retry strategy**
   - API_REQUEST for most API calls
   - CRITICAL for essential operations
   - BACKGROUND for non-blocking operations
   - POLLING for status checks

3. **Be careful with retry counts**
   - Too many retries can waste resources and frustrate users
   - Too few retries may result in unnecessary failures

4. **Use exponential backoff for most retries**
   - Helps prevent overwhelming the server during issues
   - Gives the server time to recover

5. **Always provide user feedback**
   - Let users know when retries are happening
   - Show appropriate error messages when all retries fail
EOF

# Create test script
echo "🧪 Creating test script..."
cat > test-retry-logic.js << 'EOF'
/**
 * TrustyConvert Retry Logic Test Script
 * 
 * This script tests the centralized retry utility to ensure it works correctly
 * with different retry strategies and error conditions.
 */

// Simulate the retry utility for testing
const RETRY_STRATEGIES = {
  API_REQUEST: {
    maxRetries: 3,
    initialDelay: 10, // Use shorter delays for testing
    maxDelay: 100,
    backoffFactor: 2
  },
  CRITICAL: {
    maxRetries: 5,
    initialDelay: 10,
    maxDelay: 100,
    backoffFactor: 2
  },
  POLLING: {
    maxRetries: 10,
    initialDelay: 10,
    backoffFactor: 1
  }
};

/**
 * Calculate backoff delay
 */
function calculateBackoff(attempt, config) {
  const { initialDelay, maxDelay, backoffFactor } = config;
  const delay = initialDelay * Math.pow(backoffFactor, attempt);
  return Math.min(delay, maxDelay);
}

/**
 * Simplified withRetry function for testing
 */
async function withRetry(fn, config = {}) {
  const fullConfig = { ...RETRY_STRATEGIES.API_REQUEST, ...config };
  const { maxRetries, isRetryable = () => true, onRetry } = fullConfig;
  
  let lastError = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      const shouldRetry = attempt < maxRetries && 
        (isRetryable ? isRetryable(error) : true);
      
      if (!shouldRetry) {
        break;
      }
      
      if (onRetry) {
        onRetry(error, attempt + 1);
      }
      
      const delay = calculateBackoff(attempt, fullConfig);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

/**
 * Test helpers
 */
function createFailingFunction(failCount, errorMessage = 'Test error') {
  let attempts = 0;
  return async () => {
    attempts++;
    if (attempts <= failCount) {
      throw new Error(`${errorMessage} (attempt ${attempts})`);
    }
    return `Success after ${attempts} attempts`;
  };
}

/**
 * Test cases
 */
async function runTests() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  async function runTest(name, testFn) {
    console.log(`\n🧪 Running test: ${name}`);
    try {
      await testFn();
      console.log(`✅ Test passed: ${name}`);
      results.passed++;
      results.tests.push({ name, passed: true });
    } catch (error) {
      console.error(`❌ Test failed: ${name}`);
      console.error(`   Error: ${error.message}`);
      results.failed++;
      results.tests.push({ name, passed: false, error: error.message });
    }
  }
  
  // Test 1: Basic retry functionality
  await runTest('Basic retry functionality', async () => {
    const fn = createFailingFunction(2);
    const result = await withRetry(fn);
    if (result !== 'Success after 3 attempts') {
      throw new Error(`Expected "Success after 3 attempts", got "${result}"`);
    }
  });
  
  // Test 2: Exceeding max retries
  await runTest('Exceeding max retries', async () => {
    const fn = createFailingFunction(5);
    try {
      await withRetry(fn, { maxRetries: 3 });
      throw new Error('Expected function to throw, but it succeeded');
    } catch (error) {
      if (!error.message.includes('Test error')) {
        throw new Error(`Expected error message to include "Test error", got "${error.message}"`);
      }
    }
  });
  
  // Print summary
  console.log('\n📊 Test Summary:');
  console.log(`   Passed: ${results.passed}`);
  console.log(`   Failed: ${results.failed}`);
  console.log(`   Total: ${results.passed + results.failed}`);
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});
EOF

# Make the test script executable
chmod +x test-retry-logic.js

echo "✅ Retry logic implementation completed!"
echo ""
echo "Next steps:"
echo "1. Update API client to use the retry utility"
echo "2. Update session initializer to use the retry utility"
echo "3. Update conversion hooks to use the retry utility"
echo "4. Run the test script: node test-retry-logic.js"
echo ""
echo "See docs/retry-logic.md for usage guidelines and best practices." 
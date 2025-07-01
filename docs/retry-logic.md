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

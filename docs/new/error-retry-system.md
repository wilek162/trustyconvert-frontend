# Error Handling and Retry System

This document outlines the integrated error handling and retry system implemented in TrustyConvert frontend.

## Table of Contents

1. [Overview](#overview)
2. [Key Components](#key-components)
3. [How to Use](#how-to-use)
4. [Configuration](#configuration)
5. [Best Practices](#best-practices)
6. [Examples](#examples)

## Overview

The TrustyConvert frontend implements a robust error handling and retry system that provides:

- Centralized error handling with user-friendly messages
- Automatic recovery strategies for common errors
- Configurable retry policies with exponential backoff
- Integration with toast notifications
- Detailed error logging and monitoring

This system ensures that the application can gracefully handle transient errors, network issues, session expiration, and other common failure scenarios while providing a smooth user experience.

## Key Components

### 1. Error Handling Service (`errorHandlingService.ts`)

The central service that processes errors, attempts recovery, and formats user-friendly messages.

- **Recovery Strategies**: Predefined strategies for handling specific error types
- **User Message Formatting**: Converts technical errors into user-friendly messages
- **Integration with Monitoring**: Reports errors to monitoring systems

### 2. Retry Module (`retry.ts`)

Provides configurable retry logic with different strategies for various scenarios.

- **Retry Strategies**: Predefined configurations for different use cases
- **Exponential Backoff**: Intelligent delay between retry attempts
- **Jitter**: Prevents thundering herd problems in concurrent scenarios

### 3. Error-Retry Integration (`errorRetry.ts`)

Combines error handling and retry logic into a unified interface.

- **withErrorRetry**: Execute a function with combined error handling and retry logic
- **createErrorRetryFunction**: Create a function wrapped with error handling and retry
- **createTypedErrorRetryFunction**: Create a function that retries only on specific error types

### 4. Error Types (`error-types.ts`)

Custom error classes for different error scenarios.

- **ApiError**: For API-related errors with status codes
- **NetworkError**: For network connectivity issues
- **ValidationError**: For input validation failures
- **ConversionError**: For file conversion failures
- **SessionError**: For session-related issues

## How to Use

### Basic Usage

```typescript
import { withErrorRetry } from '@/lib/utils/errorRetry';

async function fetchData() {
  const result = await withErrorRetry(
    async () => {
      // Your async operation here
      const response = await api.getData();
      return response.data;
    },
    {
      component: 'MyComponent',
      action: 'fetchData',
      retryStrategy: 'API_REQUEST'
    }
  );
  
  return result;
}
```

### Creating Retryable Functions

```typescript
import { createErrorRetryFunction } from '@/lib/utils/errorRetry';

const fetchUserData = createErrorRetryFunction(
  async (userId: string) => {
    const response = await api.getUser(userId);
    return response.data;
  },
  {
    component: 'UserProfile',
    action: 'fetchUserData',
    retryStrategy: 'API_REQUEST',
    showToast: true
  }
);

// Use the wrapped function
const userData = await fetchUserData('user123');
```

### Handling Specific Error Types

```typescript
import { createTypedErrorRetryFunction } from '@/lib/utils/errorRetry';
import { NetworkError, SessionError } from '@/lib/errors/error-types';

const fetchSecureData = createTypedErrorRetryFunction(
  async () => {
    const response = await api.getSecureData();
    return response.data;
  },
  ['NetworkError', 'SessionError'], // Only retry these error types
  {
    component: 'SecureDataComponent',
    action: 'fetchSecureData',
    retryStrategy: 'CRITICAL'
  }
);
```

## Configuration

### Retry Strategies

The system provides several predefined retry strategies:

1. **API_REQUEST**: For general API requests (3 retries, faster backoff)
2. **CRITICAL**: For critical operations (5 retries, moderate backoff)
3. **BACKGROUND**: For background operations (10 retries, slow backoff)
4. **POLLING**: For status polling (60 retries, fixed interval)

### Error Context Options

When using the error retry system, you can provide context options:

```typescript
{
  // Error handling options
  showToast?: boolean        // Whether to show toast notifications
  rethrow?: boolean          // Whether to rethrow errors after handling
  severity?: 'error' | 'warning' | 'info'  // Toast severity
  
  // Retry options
  retryStrategy?: 'API_REQUEST' | 'CRITICAL' | 'BACKGROUND' | 'POLLING'
  maxRetries?: number        // Override strategy's max retries
  initialDelay?: number      // Override strategy's initial delay
  maxDelay?: number          // Override strategy's max delay
  
  // Context information
  component?: string         // Component name for logging
  action?: string            // Action being performed
  
  // Additional context (any key-value pairs)
  [key: string]: any
}
```

## Best Practices

1. **Choose the Right Strategy**: Select the appropriate retry strategy based on the operation's importance and visibility to the user.

2. **Provide Context**: Always include component and action names to help with debugging and monitoring.

3. **Handle User Experience**: Use `showToast` appropriately - enable for user-initiated actions, disable for background operations.

4. **Limit Retries for User Operations**: For operations that block the UI, use fewer retries (2-3) to avoid frustrating the user.

5. **Use Recovery Strategies**: Register custom recovery strategies for specific error types when needed.

6. **Avoid Infinite Loops**: Always set a reasonable `maxRetries` value to prevent infinite retry loops.

7. **Log Exhausted Retries**: Implement proper logging when all retries are exhausted to help with debugging.

## Examples

### API Client Integration

```typescript
// In API client
import { createErrorRetryFunction } from '@/lib/utils/errorRetry';

export const fetchData = createErrorRetryFunction(
  async (endpoint: string) => {
    const response = await fetch(`/api/${endpoint}`);
    if (!response.ok) {
      throw new ApiError('API request failed', response.status, 'API_ERROR');
    }
    return await response.json();
  },
  {
    retryStrategy: 'API_REQUEST',
    showToast: true
  }
);
```

### React Hook Integration

```typescript
// In a React hook
import { useState, useCallback } from 'react';
import { withErrorRetry } from '@/lib/utils/errorRetry';

export function useDataFetcher() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const fetchData = useCallback(async (id: string) => {
    setLoading(true);
    
    try {
      const result = await withErrorRetry(
        async () => {
          const response = await api.getData(id);
          return response.data;
        },
        {
          component: 'useDataFetcher',
          action: 'fetchData',
          retryStrategy: 'API_REQUEST'
        }
      );
      
      setData(result);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { data, loading, fetchData };
}
```

### File Upload with Progress

```typescript
import { withErrorRetry } from '@/lib/utils/errorRetry';

async function uploadFile(file: File, onProgress: (progress: number) => void) {
  return withErrorRetry(
    async () => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      });
      
      return await response.json();
    },
    {
      component: 'FileUploader',
      action: 'uploadFile',
      retryStrategy: 'API_REQUEST',
      showToast: true,
      fileSize: file.size,
      fileName: file.name
    }
  );
}
``` 
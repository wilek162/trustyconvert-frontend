# Error Handling Guide

## Overview

TrustyConvert uses a centralized error handling system that integrates with the toast messaging system to provide consistent error reporting, logging, and user feedback across the application.

## Key Components

### Error Types

Located in `src/lib/errors/error-types.ts`, these are specialized error classes for different error scenarios:

- `ApiError`: For API-related errors with status codes
- `NetworkError`: For network connectivity issues
- `ValidationError`: For input validation failures
- `ConversionError`: For file conversion failures
- `SessionError`: For session-related issues

### Error Handling Utilities

Located in `src/lib/utils/errorHandling.ts`, these utilities provide:

- Centralized error logging and reporting
- Standardized error formatting for user display
- Integration with the toast messaging system
- Global error handlers for uncaught exceptions

### Message Utilities

Located in `src/lib/utils/messageUtils.ts`, these utilities provide:

- Standardized message templates
- Consistent toast notifications
- Message formatting with variables

## How to Use

### Basic Error Handling

```typescript
import { handleError } from '@/lib/utils/errorHandling';

try {
  await uploadFile(file);
} catch (error) {
  handleError(error, {
    context: { component: 'FileUploader', action: 'uploadFile' },
    showToast: true
  });
}
```

### Creating Custom Errors

```typescript
import { ValidationError } from '@/lib/utils/errorHandling';

if (!isValidFile(file)) {
  throw new ValidationError('File type not supported', 'fileType');
}
```

### Using with API Calls

```typescript
import { handleError, NetworkError } from '@/lib/utils/errorHandling';
import { MESSAGE_TEMPLATES } from '@/lib/utils/messageUtils';

async function fetchData() {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new NetworkError('API request failed', { status: response.status });
    }
    return await response.json();
  } catch (error) {
    handleError(error, {
      context: { component: 'DataFetcher', action: 'fetchData' },
      showToast: true
    });
    return null;
  }
}
```

### Error Handling with Severity Levels

```typescript
import { handleError } from '@/lib/utils/errorHandling';

try {
  await saveData();
} catch (error) {
  // For non-critical errors, use warning severity
  handleError(error, {
    context: { component: 'DataForm', action: 'saveData' },
    showToast: true,
    severity: 'warning'
  });
}
```

### Using Error Message Templates

```typescript
import { getErrorMessageTemplate } from '@/lib/utils/errorHandling';
import { showError } from '@/lib/utils/messageUtils';

try {
  await processFile();
} catch (error) {
  // Get the appropriate message template for this error type
  const messageTemplate = getErrorMessageTemplate(error);
  showError(messageTemplate);
}
```

### Wrapping Functions with Error Handling

```typescript
import { withErrorHandling } from '@/lib/utils/errorHandling';

const safeFunction = withErrorHandling(riskyFunction);

// Now safeFunction won't throw errors, but will handle them internally
const result = await safeFunction();
```

## Error Handling in Different Contexts

### API Client Errors

The API client (`src/lib/api/_apiClient.ts`) uses error handling to:

1. Detect and handle network issues
2. Process API error responses
3. Handle CSRF validation failures
4. Manage session expiration
5. Retry failed requests when appropriate

Example:
```typescript
// From _apiClient.ts
try {
  const response = await fetchWithTimeout(url, fetchOptions);
  return await processApiResponse<T>(response, endpoint);
} catch (error) {
  if (error instanceof NetworkError) {
    throw error;
  }
  throw new NetworkError('Unknown error during API request', { endpoint });
}
```

### Form Validation Errors

For form validation errors, use the `ValidationError` class:

```typescript
import { ValidationError } from '@/lib/utils/errorHandling';
import { showError, formatMessage, MESSAGE_TEMPLATES } from '@/lib/utils/messageUtils';

function validateForm(data) {
  if (!data.email) {
    const message = formatMessage(MESSAGE_TEMPLATES.validation.required, { field: 'Email' });
    showError(message);
    throw new ValidationError('Email is required', 'email');
  }
}
```

### Conversion Errors

For file conversion errors:

```typescript
import { ConversionError } from '@/lib/utils/errorHandling';
import { showError, MESSAGE_TEMPLATES } from '@/lib/utils/messageUtils';

try {
  await convertFile(jobId, targetFormat);
} catch (error) {
  if (error.status === 'unsupported_format') {
    showError(MESSAGE_TEMPLATES.conversion.unsupportedFormat);
    throw new ConversionError('Unsupported format', jobId, 'unsupported_format');
  }
  // Handle other errors...
}
```

## Best Practices

1. **Use Appropriate Error Types**: Choose the right error type for each situation
2. **Provide Context**: Always include relevant context when handling errors
3. **User-Friendly Messages**: Use message templates for consistent user feedback
4. **Log Errors**: Ensure errors are logged for debugging and monitoring
5. **Handle Async Errors**: Use try/catch with async/await or promise chains
6. **Global Error Handling**: Let the global handlers catch unexpected errors

## Integration with Toast System

The error handling system integrates with the toast messaging system to provide consistent user feedback:

```typescript
// In errorHandling.ts
export function handleError(
  error: unknown,
  options: {
    context?: ErrorContext
    showToast?: boolean
    rethrow?: boolean
    severity?: 'error' | 'warning'
  } = {}
): string {
  // Log the error
  logError(error, options.context || {});

  // Format for user display
  const userMessage = formatErrorForUser(error);

  // Show toast if requested
  if (options.showToast) {
    if (options.severity === 'warning') {
      showWarning(userMessage, {
        duration: 8000,
        dismissible: true
      });
    } else {
      showError(userMessage, {
        duration: 10000,
        dismissible: true
      });
    }
  }

  // Rethrow if requested
  if (options.rethrow && error instanceof Error) {
    throw error;
  }

  return userMessage;
}
```

## Error Monitoring

All errors are automatically reported to the monitoring service through the `reportError` function:

```typescript
// In errorHandling.ts
function logError(error: unknown, context: ErrorContext = {}): void {
  // In development, log to console with detailed info
  if (import.meta.env.DEV) {
    console.group('Application Error');
    console.error(error);
    console.log('Error Context:', context);
    console.groupEnd();
  }

  // In production, send to monitoring service
  reportError(error instanceof Error ? error : new Error(String(error)), context);
}
``` 
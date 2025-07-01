# TrustyConvert API Integration Implementation

This document summarizes the implementation of the API integration between the TrustyConvert frontend and backend services.

## Overview

The integration follows the specifications in the [API Integration Guide](../API_INTEGRATION_GUIDE.md) and implements the complete file conversion workflow:

1. Session initialization and CSRF token management
2. File upload
3. Format conversion
4. Job status polling
5. Download token retrieval
6. File download

## Implementation Components

### API Client Layer

- **`src/lib/api/apiClient.ts`**: Low-level API client that handles direct communication with the backend API.
- **`src/lib/api/client.ts`**: Higher-level API client that provides a simplified interface for components.
- **`src/lib/api/config.ts`**: Centralized configuration for API endpoints and settings.

### Session Management

- **`src/lib/hooks/useSessionInitializer.ts`**: React hook that handles session initialization.
- **`src/lib/stores/session.ts`**: State management for session data.
- **`src/lib/utils/csrfUtils.ts`**: Utilities for CSRF token management.

### Conversion Flow Components

- **`src/components/features/conversion/ConversionFlow.tsx`**: Main component that orchestrates the entire conversion process.
- **`src/components/features/conversion/FormatSelector.tsx`**: Component for selecting the target format.
- **`src/components/features/conversion/ConversionStats.tsx`**: Component for displaying conversion statistics.
- **`src/components/features/conversion/ConversionProgress.tsx`**: Component for displaying conversion progress.
- **`src/components/features/upload/UploadZone.tsx`**: Component for handling file uploads.
- **`src/components/features/conversion/DownloadManager.tsx`**: Component for handling secure download token retrieval and file download.

## Download Flow Implementation

The download process follows these steps:

1. **Token Retrieval**: When a conversion job completes, the `DownloadManager` component requests a secure download token from the API using the `getDownloadToken` function.
2. **Token Storage**: The download token is stored in the upload store using `setJobDownloadToken` for potential reuse.
3. **Download URL Construction**: A secure download URL is constructed using the API configuration: `${apiConfig.baseUrl}${apiConfig.endpoints.download}?token=${token}`.
4. **Download Initiation**: The user clicks the download button, which opens the download URL.
5. **Token Expiration**: Download tokens are short-lived (10 minutes) and single-use for security.

## Security Implementation

### CSRF Protection

The implementation uses the Double Submit Cookie pattern for CSRF protection:

1. The server sets a CSRF token in a cookie during session initialization.
2. The client extracts this token and sends it in the `X-CSRF-Token` header for all state-changing requests.
3. The server validates that the token in the header matches the one in the cookie.

### Cookie Management

- Cookies are sent with the `credentials: 'include'` option for all API requests.
- The session cookie is managed by the browser and server.
- The CSRF token is stored both in a cookie and in memory for validation.

### Secure Downloads

- Download tokens are single-use and short-lived.
- Tokens are bound to specific sessions and job IDs.
- The download endpoint is protected by the token validation.
- File downloads use proper Content-Disposition headers for security.

## Error Handling

- Centralized error handling in the API client.
- Typed error responses for different error scenarios (network, validation, session).
- User-friendly error messages displayed in the UI.
- Correlation IDs tracked for debugging.
- Retry mechanisms for transient errors with exponential backoff.

## Data Persistence

- Job information is stored in IndexedDB for persistence across page refreshes.
- Download tokens are cached to allow redownloading without requesting new tokens.
- Session information is maintained in memory and cookies.

## Testing

Two testing approaches are implemented:

1. **Manual Testing Page**: `src/pages/convert/test-api.astro` provides a UI for testing the API integration.
2. **Automated Test Script**: `test-api-integration.js` runs a headless test of the complete API flow.

## Usage Example

```tsx
// Example usage of the ConversionFlow component
import { ConversionFlow } from '@/components/features/conversion';

function ConversionPage() {
  return (
    <div>
      <h1>Convert Your File</h1>
      <ConversionFlow />
    </div>
  );
}

// Example usage of the DownloadManager component
import { DownloadManager } from '@/components/features/conversion';

function DownloadPage({ jobId }) {
  return (
    <div>
      <h1>Download Your Converted File</h1>
      <DownloadManager jobId={jobId} />
    </div>
  );
}
```

## Best Practices Implemented

1. **Type Safety**: All API responses and requests are fully typed.
2. **Error Handling**: Comprehensive error handling with user-friendly messages.
3. **Session Management**: Automatic session initialization and CSRF token management.
4. **Modular Design**: Components are modular and reusable.
5. **Progressive Enhancement**: The UI provides feedback during all stages of the conversion process.
6. **Security**: CSRF protection, secure cookie handling, and input validation.
7. **Configuration**: Centralized API configuration for easy updates.
8. **Cross-Origin Support**: Proper CORS handling with credentials.

## Future Improvements

1. Implement batch conversion support when the API supports it.
2. Add file preview functionality.
3. Enhance error recovery mechanisms.
4. Implement offline support with upload queue.
5. Add analytics tracking for conversion metrics.
6. Implement download resumability for large files.
7. Add support for direct sharing of converted files.

# API Integration Guidelines

This document outlines the guidelines and best practices for integrating with the TrustyConvert backend API.

## API Client Architecture

The API client is structured in layers to provide a clean, maintainable, and secure interface for communicating with the backend:

### 1. Core API Client (`src/lib/api/_apiClient.ts`)

This is the low-level client that handles direct communication with the API. It should **never be imported directly** by components or other modules outside the API layer.

Key responsibilities:
- Making HTTP requests with proper error handling
- Handling CSRF token management
- Processing API responses
- Implementing retry logic
- Handling timeouts

### 2. Public API Client (`src/lib/api/client.ts`)

This is the public interface that should be used by all components and services. It provides:

- Type-safe methods for each API endpoint
- Higher-level error handling
- Response standardization
- Logging and monitoring integration

### 3. Configuration (`src/lib/api/config.ts`)

Contains all API-related configuration:

- API URLs for different environments
- Timeout settings
- Retry strategies
- CORS configuration
- Endpoint paths

## API Request Flow

```
Component/Service → client.ts → _apiClient.ts → Backend API
                        ↓
                Error Handling
                        ↓
                  Retry Logic
```

## Using the API Client

### Basic Usage

```typescript
import client from '@/lib/api/client';

// Example: Upload a file
try {
  const response = await client.uploadFile(file);
  // Handle successful response
} catch (error) {
  // Handle error
}

// Example: Convert a file
try {
  const response = await client.convertFile(jobId, 'pdf', 'docx');
  // Handle successful response
} catch (error) {
  // Handle error
}
```

### With React Hooks

```typescript
import { useApi } from '@/lib/hooks/useApi';
import client from '@/lib/api/client';

function MyComponent() {
  const { data, isLoading, error, execute } = useApi(
    (file) => client.uploadFile(file),
    { executeOnMount: false }
  );

  const handleUpload = async (file) => {
    await execute(file);
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <div>
      <FileUploadButton onUpload={handleUpload} />
      {data && <SuccessMessage />}
    </div>
  );
}
```

## Error Handling

The API client uses a structured approach to error handling:

### Error Types

```typescript
// From src/lib/utils/errorHandling.ts
export class NetworkError extends Error {
  type = 'network';
  userMessage = 'Network error. Please check your connection and try again.';
  // ...
}

export class ValidationError extends Error {
  type = 'validation';
  userMessage = 'The provided data is invalid. Please check your input and try again.';
  // ...
}

export class SessionError extends Error {
  type = 'session';
  userMessage = 'Your session has expired. Please refresh the page and try again.';
  // ...
}
```

### Handling Errors

```typescript
import { handleError } from '@/lib/utils/errorHandling';

try {
  const response = await client.uploadFile(file);
  return response;
} catch (error) {
  // handleError logs the error and returns a structured error object
  throw handleError(error, {
    context: { action: 'uploadFile', fileName: file.name }
  });
}
```

### Displaying Errors to Users

```typescript
import { useErrorHandler } from '@/lib/hooks/useErrorHandler';

function MyComponent() {
  const { handleError, errorMessage } = useErrorHandler();

  const handleUpload = async (file) => {
    try {
      await client.uploadFile(file);
    } catch (error) {
      handleError(error);
    }
  };

  return (
    <div>
      {errorMessage && <ErrorAlert message={errorMessage} />}
      <FileUploadButton onUpload={handleUpload} />
    </div>
  );
}
```

## Retry Logic

The API client includes built-in retry logic for handling transient errors:

```typescript
// From src/lib/utils/retry.ts
export const RETRY_STRATEGIES = {
  API_REQUEST: {
    maxRetries: 3,
    initialDelay: 500,
    backoffFactor: 2,
    jitter: true
  },
  POLLING: {
    maxRetries: 5,
    initialDelay: 1000,
    backoffFactor: 1.5,
    jitter: true
  }
};

// Usage in API client
const response = await withRetry(
  () => _apiClient.uploadFile(file),
  {
    ...RETRY_STRATEGIES.API_REQUEST,
    onRetry: (error, attempt) => {
      debugLog(`Retrying upload (attempt ${attempt})`);
    }
  }
);
```

## Session Management

The API client integrates with the session manager to handle authentication and CSRF protection:

```typescript
// From src/lib/services/sessionManager.ts
const sessionManager = {
  initSession: async (force = false) => {
    if (hasCsrfToken() && !force) return true;
    
    try {
      const response = await _apiClient.initSession();
      if (response?.success && response?.data?.csrf_token) {
        setCsrfToken(response.data.csrf_token);
        return true;
      }
      return false;
    } catch (error) {
      debugError('Failed to initialize session', error);
      return false;
    }
  },
  
  getCsrfHeaders: () => {
    const token = getCsrfToken();
    if (!token) return {};
    
    return {
      [apiConfig.csrfTokenHeader]: token
    };
  },
  
  // Other methods...
};
```

## API Endpoints

The API provides the following endpoints:

| Endpoint | Description | Client Method |
|----------|-------------|--------------|
| `/session/init` | Initialize a new session | `client.initSession()` |
| `/session/close` | Close an existing session | `client.closeSession()` |
| `/upload` | Upload a file | `client.uploadFile(file)` |
| `/convert` | Convert a file | `client.convertFile(jobId, targetFormat)` |
| `/job_status` | Get job status | `client.getConversionStatus(jobId)` |
| `/download_token` | Get download token | `client.getDownloadToken(jobId)` |
| `/download` | Download a file | `client.getDownloadUrl(token)` |
| `/convert/formats` | Get supported formats | `client.getSupportedFormats()` |

## Best Practices

### 1. Always Check for Session Before API Calls

```typescript
// Ensure we have a valid session before uploading
if (!sessionManager.hasCsrfToken()) {
  await sessionManager.initSession();
}

const response = await _apiClient.uploadFile(file);
```

### 2. Handle CSRF Errors

```typescript
// Check for CSRF error
if (isCsrfError(response)) {
  // Reset the session and retry once
  await sessionManager.resetSession();
  await sessionManager.initSession(true);
  const retryResponse = await _apiClient.uploadFile(file);
  return standardizeResponse(retryResponse.data);
}
```

### 3. Use Type-Safe Responses

```typescript
// Define response types
export interface UploadResponse {
  job_id: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  status: string;
}

// Use typed responses
const response = await client.uploadFile(file);
const jobId = response.job_id; // Type-safe access
```

### 4. Implement Polling for Long-Running Operations

```typescript
import { useJobPolling } from '@/lib/hooks/useJobPolling';

function ConversionStatus({ jobId }) {
  const { status, progress, error } = useJobPolling(jobId);
  
  if (status === 'completed') {
    return <DownloadButton jobId={jobId} />;
  }
  
  return <ProgressBar value={progress} />;
}
```

### 5. Handle Network Conditions

```typescript
import { useOnlineStatus } from '@/lib/hooks/useOnlineStatus';

function UploadButton({ onUpload }) {
  const isOnline = useOnlineStatus();
  
  return (
    <Button 
      onClick={onUpload} 
      disabled={!isOnline}
    >
      {isOnline ? 'Upload File' : 'Offline - Cannot Upload'}
    </Button>
  );
}
```

## Security Considerations

### 1. CSRF Protection

All non-GET requests must include a CSRF token in the headers:

```typescript
const headers = new Headers(fetchOptions.headers || {});
const csrfHeaders = sessionManager.getCsrfHeaders();

for (const [key, value] of Object.entries(csrfHeaders)) {
  headers.set(key, value);
}

fetchOptions.headers = headers;
```

### 2. Secure Cookies

The API uses secure, HTTP-only cookies for session management. Always include credentials in requests:

```typescript
fetchOptions.credentials = 'include';
```

### 3. Content Security Policy

Ensure API calls comply with the application's Content Security Policy:

```typescript
// In your CSP configuration
const cspConfig = {
  'connect-src': ["'self'", apiConfig.apiDomain]
};
```

### 4. Input Validation

Always validate user input before sending to the API:

```typescript
function validateFileSize(file: File, maxSize: number): boolean {
  return file.size <= maxSize;
}

function validateFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

// Usage
if (!validateFileSize(file, MAX_FILE_SIZE) || !validateFileType(file, ALLOWED_TYPES)) {
  throw new ValidationError({
    message: 'Invalid file',
    context: { fileName: file.name, fileSize: file.size, fileType: file.type }
  });
}
```

## Debugging

The API client includes built-in debugging utilities:

```typescript
import { debugLog, debugError } from '@/lib/utils/debug';

// Log debug information
debugLog('Uploading file', { fileName: file.name, fileSize: file.size });

// Log errors
debugError('Upload failed', error);
```

To enable debug logging in development:

```typescript
// In your browser console
localStorage.setItem('debug', 'true');
```

## Testing API Integration

### 1. Mock API Responses

```typescript
// In your test file
import { vi } from 'vitest';
import client from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  uploadFile: vi.fn().mockResolvedValue({
    job_id: 'mock-job-id',
    status: 'uploaded'
  })
}));

test('handles successful upload', async () => {
  // Test component that uses the API
});
```

### 2. Test Error Handling

```typescript
test('handles upload error', async () => {
  // Mock an error response
  client.uploadFile.mockRejectedValueOnce(new Error('Upload failed'));
  
  // Test component handles the error correctly
});
```

### 3. Integration Tests

For full integration tests, you can use MSW (Mock Service Worker) to intercept actual API calls:

```typescript
import { setupServer } from 'msw/node';
import { rest } from 'msw';

const server = setupServer(
  rest.post(`${apiConfig.baseUrl}/upload`, (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          job_id: 'test-job-id',
          status: 'uploaded'
        }
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
``` 
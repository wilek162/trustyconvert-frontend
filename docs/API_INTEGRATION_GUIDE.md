# TrustyConvert API Integration Guide

This document explains how to integrate with the TrustyConvert API in the frontend application. It covers authentication, session management, file operations, error handling, and testing.

## Table of Contents

1. [API Client Architecture](#api-client-architecture)
2. [Session Management](#session-management)
3. [File Upload and Conversion](#file-upload-and-conversion)
4. [Status Polling](#status-polling)
5. [Download Flow](#download-flow)
6. [Error Handling](#error-handling)
7. [Testing API Integration](#testing-api-integration)
8. [React Hooks](#react-hooks)

## API Client Architecture

The API client is implemented using a layered architecture:

### Layer 1: Low-level API Client (`apiClient.ts`)

This layer handles direct communication with the API:

- Makes HTTP requests with proper headers
- Manages CSRF tokens
- Handles retries and timeouts
- Processes API responses
- Implements error handling

```typescript
// Example of low-level API function
export async function initSession(): Promise<ApiResponse<SessionInitResponse>> {
  return await apiFetch<SessionInitResponse>('/session/init', {
    skipAuthCheck: true
  });
}
```

### Layer 2: High-level API Client (`client.ts`)

This layer provides a simpler interface for components:

- Standardizes response formats
- Handles common workflows
- Provides type-safe interfaces

```typescript
// Example of high-level API function
export const apiClient = {
  initSession: async () => {
    try {
      const response = await initSession();
      return response.data;
    } catch (error) {
      throw handleError(error, { context: { action: 'initSession' } });
    }
  },
  // ...other methods
};
```

### Layer 3: React Hooks

These hooks integrate the API with React components:

- Manage loading, error, and data states
- Handle polling and cancellation
- Provide UI-friendly interfaces

```typescript
// Example of React hook
export function useConversionStatus({ taskId, onError }) {
  return useQuery<ConversionStatusResponse, Error>({
    queryKey: ['conversion-status', taskId],
    queryFn: () => apiClient.getConversionStatus(taskId),
    // ...other options
  });
}
```

## Session Management

### Session Initialization

Before any API operations, initialize a session:

```typescript
// Using the hook
const { isInitialized, isInitializing, error } = useSessionInitializer();

// Or directly with the API client
await apiClient.initSession();
```

The session initialization process:

1. Checks if a CSRF token already exists in cookies
2. If not, calls the `/session/init` endpoint
3. Stores the CSRF token for future requests
4. Sets up error listeners for CSRF failures

### CSRF Token Management

The application uses the Double Submit Cookie pattern for CSRF protection:

1. The server sets a `XSRF-TOKEN` cookie during session initialization
2. The frontend reads this cookie and sends its value in the `X-CSRF-Token` header
3. The server validates that the cookie and header match

```typescript
// Getting the CSRF token from cookies
const token = getCsrfTokenFromCookie();

// The token is automatically included in API requests
// by the apiClient for state-changing operations
```

### Session Cleanup

When the user is done, close the session:

```typescript
await apiClient.closeSession();
```

## File Upload and Conversion

### File Upload

```typescript
// Upload a file
const uploadResponse = await apiClient.uploadFile(file);
const jobId = uploadResponse.job_id;
```

### File Conversion

```typescript
// Convert a file
const conversionResponse = await apiClient.convertFile(jobId, 'pdf');
```

### Combined Upload and Convert

```typescript
// Upload and convert in one step
const response = await apiClient.startConversion(file, 'pdf');
const jobId = response.job_id;
```

## Status Polling

After starting a conversion, poll for status updates:

```typescript
// Using the hook
const { status, progress, downloadUrl } = useConversionStatus({ taskId: jobId });

// Or directly with the API client
const statusResponse = await apiClient.getConversionStatus(jobId);
```

The status can be one of:
- `idle`: Not started
- `pending`: Waiting to start
- `uploading`: File is uploading
- `processing`: Conversion in progress
- `completed`: Conversion completed successfully
- `failed`: Conversion failed

## Download Flow

### Getting a Download Token

```typescript
const tokenResponse = await apiClient.getDownloadToken(jobId);
const downloadToken = tokenResponse.download_token;
```

### Downloading the File

```typescript
// Using the hook
const { download, isDownloading, progress } = useFileDownload();
download(jobId, filename);

// Or directly with the API client
const blob = await apiClient.downloadConvertedFile(jobId, {
  onProgress: (progress) => {
    console.log(`Downloaded ${progress.loaded} of ${progress.total} bytes`);
  }
});
```

## Error Handling

The API client provides structured error handling:

```typescript
try {
  await apiClient.startConversion(file, 'pdf');
} catch (error) {
  // Error is already processed by handleError
  console.error(error.userMessage); // User-friendly message
}
```

### Error Types

- `NetworkError`: Connection issues
- `ValidationError`: Input validation failures
- `SessionError`: Authentication/session problems
- `AppError`: Generic application errors

## Testing API Integration

### Using the Test Script

```bash
# Run the shell test script
./test-api.sh

# Run the Node.js test script
node test-api-integration.js
```

### Manual Testing

1. Initialize a session
2. Upload a file
3. Convert the file
4. Poll for status
5. Get a download token
6. Download the file
7. Close the session

## React Hooks

### `useSessionInitializer`

Initializes the session and manages CSRF tokens:

```typescript
const { isInitialized, isInitializing, error, resetSession } = useSessionInitializer();
```

### `useConversionStatus`

Polls for conversion status:

```typescript
const { 
  status, 
  progress, 
  downloadUrl, 
  fileName, 
  fileSize, 
  isLoading, 
  error 
} = useConversionStatus({ taskId });
```

### `useFileDownload`

Handles file downloads with progress tracking:

```typescript
const { 
  download, 
  cancel, 
  isDownloading, 
  progress, 
  error 
} = useFileDownload({
  onProgress: (progress) => console.log(`${progress.loaded}/${progress.total}`),
  onComplete: () => console.log('Download complete'),
  onError: (error) => console.error(error)
});

// Start download
download(jobId, fileName);
```

### `useFileConversion`

Manages the entire conversion flow:

```typescript
const {
  file,
  setFile,
  format,
  setFormat,
  startConversion,
  status,
  progress,
  downloadUrl,
  error
} = useFileConversion();
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/session/init` | GET | Initialize session and get CSRF token |
| `/session/close` | POST | Close session and clean up resources |
| `/upload` | POST | Upload a file |
| `/convert` | POST | Start conversion process |
| `/job_status` | GET | Check conversion status |
| `/download_token` | POST | Get download token |
| `/download` | GET | Download converted file |
| `/convert/formats` | GET | Get supported formats | 
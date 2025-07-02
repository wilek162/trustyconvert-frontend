# API Client Architecture

## Overview

The TrustyConvert frontend implements a layered API client architecture that separates concerns and provides a clean interface for components to interact with the backend. This document explains the architecture, components, and best practices for working with the API client.

## Architecture Components

### 1. API Client Layers

The API client is structured in three layers:

1. **_apiClient.ts**: Low-level HTTP client
   - Makes raw HTTP requests to the backend
   - Handles HTTP-specific concerns (headers, timeouts, etc.)
   - Processes API responses and extracts CSRF tokens

2. **client.ts**: High-level API client
   - Provides a clean interface for components
   - Coordinates with sessionManager for session state
   - Handles error processing and retry logic
   - Standardizes response formats

3. **sessionManager.ts**: Session state management
   - Manages client-side session state
   - Stores and provides CSRF tokens
   - Tracks session initialization state

### 2. Request Flow

The typical request flow follows this sequence:

```
Component → client.method() → sessionManager.ensureSession() → _apiClient.method() → Backend API
```

1. Component calls a client method
2. Client checks session state via sessionManager
3. If needed, initializes a session via sessionManager
4. Makes the API call via _apiClient
5. Processes the response and handles errors
6. Returns standardized data to the component

### 3. Response Processing

API responses are processed through:

1. **Response Extraction**: Data is extracted from the response
2. **CSRF Token Handling**: CSRF tokens are extracted from headers
3. **Error Handling**: Errors are processed and standardized
4. **Response Standardization**: Responses are converted to a consistent format

## Key Components in Detail

### _apiClient.ts

The low-level API client handles direct HTTP communication:

```typescript
// Key methods
initSession(): Promise<SessionInitResponse>
uploadFile(file: File, fileJobId?: string): Promise<AxiosResponse>
convertFile(jobId: string, targetFormat: string, sourceFormat?: string): Promise<AxiosResponse>
startConversion(file: File, targetFormat: string): Promise<AxiosResponse>
getDownloadToken(jobId: string): Promise<AxiosResponse>
```

#### HTTP Request Handling

The _apiClient:

- Creates and configures Axios instances
- Sets base URLs, timeouts, and other HTTP options
- Adds headers to requests (including CSRF tokens)
- Handles HTTP-specific error codes

#### Response Processing

For each response, the _apiClient:

- Extracts CSRF tokens from headers
- Updates the session store with new tokens
- Processes HTTP-specific errors
- Returns raw response data

### client.ts

The high-level API client provides a clean interface for components:

```typescript
// Key methods
initSession(forceNew?: boolean): Promise<SessionInitResponse | null>
ensureSession(): Promise<boolean>
uploadFile(file: File, fileJobId?: string): Promise<StandardResponse>
convertFile(jobId: string, targetFormat: string, sourceFormat?: string): Promise<StandardResponse>
startConversion(file: File, targetFormat: string): Promise<StandardResponse>
getDownloadToken(jobId: string): Promise<StandardResponse>
```

#### Session Management Delegation

The client delegates session management to sessionManager:

- client.initSession() is a wrapper around sessionManager.initSession()
- client.ensureSession() is a wrapper around sessionManager.ensureSession()
- All API methods check for valid sessions before making API calls

#### Error Handling

The client provides centralized error handling:

- Standardizes error formats
- Adds context to errors
- Implements retry logic for certain errors
- Logs errors for debugging

#### Response Standardization

The client standardizes responses:

- Converts different response formats to a consistent structure
- Extracts relevant data for components
- Handles pagination and other response metadata

### sessionManager.ts

The session manager is the single source of truth for session state:

```typescript
// Key methods
hasCsrfToken(): boolean
getCsrfToken(): string | null
setCsrfToken(token: string): boolean
ensureSession(): Promise<boolean>
initSession(forceNew?: boolean): Promise<boolean>
resetSession(): Promise<boolean>
```

The session manager:

- Manages the session state lifecycle
- Handles CSRF token storage and retrieval
- Provides session validation methods
- Implements session initialization logic
- Tracks session initialization state

## Relationship Between Components

### client.ts and sessionManager.ts

The relationship between client.ts and sessionManager.ts follows the delegation pattern:

1. **Session Management**: client.ts delegates all session management to sessionManager.ts
2. **API Compatibility**: client.ts provides API compatibility wrappers for session methods
3. **Session Checking**: client.ts checks session state before making API calls
4. **Error Handling**: client.ts handles session-related errors from API calls

### _apiClient.ts and sessionManager.ts

The _apiClient.ts and sessionManager.ts interact through:

1. **Token Extraction**: _apiClient.ts extracts CSRF tokens from API responses
2. **Token Storage**: _apiClient.ts updates sessionManager's token store
3. **Header Enrichment**: _apiClient.ts gets CSRF headers from sessionManager

## Best Practices

### 1. API Call Patterns

Use the client.ts methods for all API calls:

```typescript
// Good: Use client.ts for API calls
const response = await client.uploadFile(file);

// Bad: Don't use _apiClient directly
const response = await _apiClient.uploadFile(file);
```

### 2. Session Checking

Let the client handle session checking:

```typescript
// Good: Client handles session checking
const response = await client.convertFile(jobId, targetFormat);

// Bad: Don't check session manually
if (sessionManager.hasCsrfToken()) {
  const response = await _apiClient.convertFile(jobId, targetFormat);
}
```

### 3. Error Handling

Use the standardized error handling:

```typescript
// Good: Use try/catch with client methods
try {
  const response = await client.uploadFile(file);
} catch (error) {
  // Error is already standardized
  showErrorMessage(error.message);
}
```

### 4. Response Processing

Work with standardized responses:

```typescript
// Good: Use standardized response properties
const response = await client.getDownloadToken(jobId);
if (response.success) {
  const { token } = response.data;
}
```

### 5. Session Management

Use the appropriate module for session management:

```typescript
// Good: Use sessionManager for direct session operations
const hasToken = sessionManager.hasCsrfToken();
const headers = sessionManager.getCsrfHeaders();

// Good: Use client for API operations that need sessions
await client.uploadFile(file);
```

## Performance Considerations

1. **Minimize API Calls**: Check if data exists locally before making API calls
2. **Session Reuse**: The client reuses existing sessions when possible
3. **Request Debouncing**: Implement debouncing for frequent API calls
4. **Response Caching**: Consider caching responses for read-only data
5. **Batch Operations**: Use batch endpoints when available

## Debugging API Issues

For API-related issues:

1. Check browser console for API errors
2. Inspect network requests in browser developer tools
3. Verify request headers, especially CSRF tokens
4. Check response status codes and error messages
5. Validate API endpoints and parameters

## Security Considerations

1. **CSRF Protection**: The client automatically includes CSRF tokens
2. **Input Validation**: Validate input before sending to the API
3. **Error Messages**: Don't expose sensitive information in error messages
4. **Authentication**: Handle authentication errors properly
5. **Secure Endpoints**: Use HTTPS for all API endpoints

## Extending the API Client

When adding new API endpoints:

1. Add the low-level method to _apiClient.ts
2. Add the high-level method to client.ts
3. Implement proper error handling
4. Standardize the response format
5. Document the new method

## Important Implementation Rules

1. **Single Source of Truth**: sessionManager.ts is the single source of truth for session state
2. **Delegation Pattern**: client.ts delegates session management to sessionManager.ts
3. **Layer Access**: Components should only use client.ts, never _apiClient.ts directly
4. **Session Checking**: Always check session validity before making API calls
5. **Response Standardization**: Always standardize responses for components

By following these guidelines, you can ensure a robust and maintainable API client architecture in the TrustyConvert frontend application. 
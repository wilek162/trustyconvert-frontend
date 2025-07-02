# Session Management Architecture

## Overview

The TrustyConvert frontend application implements a robust session management system to handle user sessions, CSRF protection, and API authentication. This document explains the architecture, components, and best practices for working with sessions in the application.

## Architecture Components

### 1. Session State Management

The session state is managed through three key components:

1. **sessionStore (nanostore)**: Persistent client-side storage for session data
2. **sessionManager.ts**: Service that provides an API for session operations
3. **SessionContext.tsx**: React context that provides session state to components

### 2. Session Initialization Flow

The session initialization follows this sequence:

```
Component → useSession().initSession() → sessionManager.ensureSession() → _apiClient.initSession() → Backend API
```

1. Component requests session initialization
2. SessionContext calls sessionManager
3. sessionManager checks if a session already exists
4. If needed, makes an API call via _apiClient
5. Backend returns session data with CSRF token in headers
6. Token is extracted and stored in sessionStore

### 3. CSRF Protection

CSRF protection is implemented through:

1. **Token Extraction**: CSRF tokens are extracted from API response headers
2. **Token Storage**: Tokens are stored in the sessionStore
3. **Request Enrichment**: Tokens are added to non-GET requests automatically
4. **Token Validation**: Backend validates tokens for protected endpoints

## Key Components in Detail

### sessionManager.ts

The session manager is the central service for session operations and the single source of truth for session management:

```typescript
// Key methods
hasCsrfToken(): boolean
getCsrfToken(): string | null
setCsrfToken(token: string): boolean
ensureSession(): Promise<boolean>
initSession(forceNew?: boolean): Promise<boolean>
resetSession(): Promise<boolean>
```

#### State Tracking

The session manager tracks:

- Whether a session is initialized
- Whether a CSRF token exists
- Whether a session initialization is in progress
- Last initialization error
- Last initialization attempt time

#### Session Initialization Logic

Session initialization follows these steps:

1. Check if a valid session already exists
2. If not, or if forceNew is true, initialize a new session
3. Make the API call to get a new session
4. Extract and store the CSRF token
5. Mark the session as initialized

### client.ts

The API client provides a wrapper around sessionManager for session operations:

```typescript
// Session-related methods
initSession(forceNew?: boolean): Promise<SessionInitResponse | null>
ensureSession(): Promise<boolean>
```

The client.ts module:

1. Does NOT directly manage sessions
2. Delegates session management to sessionManager.ts
3. Provides API compatibility for components
4. Handles session checking before API calls

#### Relationship with sessionManager

- client.initSession() is a wrapper around sessionManager.initSession()
- client.ensureSession() is a wrapper around sessionManager.ensureSession()
- All API methods in client.ts check for valid sessions before making API calls

### SessionContext.tsx

The SessionContext provides React components with:

- Current session state (`isSessionInitialized`)
- Session initialization status (`isInitializing`)
- Methods to initialize (`initSession`) and reset (`resetSession`) sessions

## Best Practices

### 1. Session Initialization

Always initialize sessions using the proper flow:

```typescript
// In components
const { isSessionInitialized, initSession } = useSession();

useEffect(() => {
  if (!isSessionInitialized) {
    initSession().catch(handleError);
  }
}, [isSessionInitialized]);
```

### 2. API Calls

Use the client.ts methods for API calls, which handle session checking:

```typescript
// Let client.ts handle session checking
const response = await client.uploadFile(file);
```

### 3. Direct Session Management

For direct session management, use sessionManager:

```typescript
// Check if a session is valid
const hasValidSession = sessionManager.hasCsrfToken() && sessionManager.getSessionState().sessionInitialized;

// Get CSRF headers for custom requests
const headers = sessionManager.getCsrfHeaders();
```

### 4. Session Validation

Always check session validity before operations that require it:

```typescript
if (!isSessionInitialized) {
  await initSession();
}
// Proceed with operation
```

### 5. Error Handling

Handle session errors properly:

```typescript
try {
  await initSession();
} catch (error) {
  // Show appropriate error message
  // Provide retry option
  // Log error for debugging
}
```

## Session Lifecycle

1. **Creation**: On first page load or when needed
2. **Validation**: Before API calls that require authentication
3. **Refresh**: When CSRF validation fails
4. **Termination**: On explicit logout or session timeout

## Performance Considerations

1. **Minimize Initialization**: Only initialize sessions when needed
2. **Reuse Sessions**: Check if a session exists before initializing
3. **Debounce Initialization**: Prevent multiple simultaneous initializations
4. **Lazy Initialization**: Initialize only when making authenticated requests

## Debugging Session Issues

For session-related issues:

1. Check browser console for session errors
2. Inspect the session state using `sessionManager.getDebugInfo()`
3. Verify CSRF tokens in request headers
4. Check for CORS issues in cross-origin requests
5. Validate backend session configuration

## Security Considerations

1. **CSRF Protection**: Always include CSRF tokens in non-GET requests
2. **Secure Cookies**: Ensure cookies use Secure and HttpOnly flags
3. **Token Validation**: Validate tokens on both client and server
4. **Session Timeouts**: Handle expired sessions gracefully
5. **Error Messages**: Don't expose sensitive information in error messages

## Important Implementation Notes

1. **Single Source of Truth**: sessionManager.ts is the single source of truth for session management
2. **Delegation Pattern**: client.ts delegates session management to sessionManager.ts
3. **Wrapper Methods**: client.initSession() and client.ensureSession() are wrappers for API compatibility
4. **Direct API Access**: _apiClient.ts should never be used directly by components
5. **Session Checking**: Always check session validity before making API calls

By following these guidelines, you can ensure robust session management in the TrustyConvert frontend application. 
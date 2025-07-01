# Server-First Session Management

## Overview

This document describes the updated approach to session management in the TrustyConvert frontend application. The key principle is treating the server as the source of truth for session state, with the client-side nanostore being updated whenever new CSRF tokens are received from the server.

## Core Principles

1. **Server as Source of Truth**: The backend is the authoritative source for session state
2. **Minimal Session Initialization**: Only initialize new sessions when absolutely necessary
3. **Synchronization First**: Always try to synchronize from cookies before creating new sessions
4. **Proper Nanostore Updates**: Update the nanostore whenever new CSRF tokens are received

## Key Components

### 1. Session Manager

The `SessionManager` service (`src/lib/services/sessionManager.ts`) has been enhanced to:

- Prioritize token synchronization from cookies over creating new sessions
- Update the nanostore whenever a new CSRF token is received from the server
- Provide a clear API for components to ensure valid sessions with minimal API calls

Key methods:

```typescript
// Synchronize token from cookie to store
synchronizeTokenFromCookie(): boolean {
  const cookieToken = getCsrfTokenFromCookie()
  const storeToken = csrfToken.get()
  
  if (!cookieToken) {
    return false
  }
  
  // If cookie token exists and differs from store token, update store
  if (cookieToken !== storeToken) {
    debugLog('Synchronizing CSRF token from cookie to store')
    return this.setCsrfToken(cookieToken)
  }
  
  // Token exists and is already synchronized
  return true
}

// Update the CSRF token when received from server
updateCsrfTokenFromServer(token: string): boolean {
  if (!token) {
    debugError('Received empty CSRF token from server')
    return false
  }
  
  debugLog('Updating CSRF token from server response')
  return this.setCsrfToken(token)
}
```

### 2. API Client

The API client (`src/lib/api/_apiClient.ts`) now:

- Extracts CSRF tokens from server responses
- Updates the nanostore when new tokens are received
- Handles CSRF errors without unnecessarily resetting sessions

Key improvements:

```typescript
// In processApiResponse function
if (contentType && contentType.includes('application/json')) {
  const jsonResponse = await response.json()
  
  // Check if response contains a new CSRF token and update it in the store
  if (jsonResponse.data && jsonResponse.data.csrf_token) {
    debugLog('Received new CSRF token from server response')
    sessionManager.updateCsrfTokenFromServer(jsonResponse.data.csrf_token)
  }
  
  return jsonResponse as ApiResponse<T>
}
```

### 3. Session Provider

The `SessionProvider` component now:

- Prioritizes synchronization from cookies over creating new sessions
- Only initializes new sessions when no valid token exists
- Handles CSRF errors by first trying to synchronize from cookies

```typescript
// Handle CSRF errors
useEffect(() => {
  const removeCsrfErrorListener = createCsrfErrorListener(() => {
    debugLog('CSRF error detected, attempting to refresh token')
    
    // First check if we can get a token from the cookie
    if (!sessionManager.synchronizeTokenFromCookie()) {
      // If no token in cookie, try to get a new one from the server
      sessionManager.initSession().then((success) => {
        if (!success) {
          showError('Session validation failed. Please refresh the page.')
        }
      })
    }
  })

  return removeCsrfErrorListener
}, [])
```

## Session Lifecycle

1. **Application Load**:
   - First try to synchronize token from cookie to nanostore
   - Only initialize a new session if no valid token exists

2. **Before API Requests**:
   - Synchronize token from cookie to ensure latest state
   - Only initialize a new session if no valid token exists

3. **After API Responses**:
   - Extract any new CSRF token from the response
   - Update the nanostore with the new token

4. **On CSRF Error**:
   - First try to synchronize token from cookie
   - Only initialize a new session if synchronization fails

5. **On Page Visibility Change**:
   - Synchronize token from cookie when page becomes visible
   - Only initialize a new session if no valid token exists

## Benefits

1. **Reduced API Calls**: Minimizes unnecessary session initialization requests
2. **Improved Reliability**: Properly synchronizes state between server and client
3. **Better UX**: Fewer session-related errors and interruptions
4. **Proper State Management**: Nanostore is always updated with the latest token
5. **Resilience**: Better handling of CSRF errors and token refreshes

## Implementation Notes

1. The server is always treated as the source of truth for session state
2. The nanostore is updated whenever new CSRF tokens are received from the server
3. Cookie synchronization is always attempted before creating new sessions
4. CSRF errors are handled with a progressive approach (sync first, then initialize)
5. Debug logging has been enhanced for better troubleshooting 
# TrustyConvert Session Management Implementation

This document provides a detailed explanation of the session management system implemented in TrustyConvert, focusing on security aspects, CSRF protection, and frontend-backend interaction.

## Session Architecture Overview

TrustyConvert implements a secure, anonymous session system that doesn't require user authentication while maintaining strong security guarantees:

1. **Server-side Sessions**: Sessions are stored on the server using Redis with a 24-hour TTL
2. **Client-side Cookies**: Session ID stored in secure, HttpOnly cookies
3. **CSRF Protection**: Separate CSRF token for cross-site request forgery protection
4. **Automatic Cleanup**: Resources are automatically cleaned up when sessions expire

## Session Lifecycle

### 1. Session Initialization

When a user visits TrustyConvert, the frontend checks for an existing session cookie. If none exists, it initializes a new session:

```typescript
// In src/lib/app.ts
async function initializeBrowser(): Promise<void> {
  // ...
  const { initSession } = await import('@/lib/api/apiClient')
  const { getInitializing } = await import('@/lib/stores/session')
  
  if (!getInitializing()) {
    try {
      await initSession()
    } catch (error) {
      console.error('Failed to initialize session:', error)
    }
  }
  // ...
}
```

The `initSession()` function makes a request to the `/session/init` endpoint, which:

1. Generates a unique session ID (UUID4)
2. Creates a CSRF token
3. Sets the session ID in an HttpOnly, Secure, SameSite=Strict cookie
4. Returns the CSRF token in the response body
5. Stores session data in Redis with a 24-hour TTL

```typescript
// In src/lib/api/apiClient.ts
export async function initSession(): Promise<ApiResponse<SessionInitResponse>> {
  setInitializing(true)

  try {
    const data = await apiFetch<SessionInitResponse>('/session/init', {
      method: 'GET',
      skipAuthCheck: true
    })

    if (data.success && data.data.csrf_token) {
      setCSRFToken(data.data.csrf_token)
    }

    return data
  } catch (error) {
    handleError(error, { context: { action: 'initSession' } })
    throw error
  } finally {
    setInitializing(false)
  }
}
```

### 2. Session Storage

Once initialized, the session information is stored in the frontend using nanostores:

```typescript
// In src/lib/stores/session.ts
interface SessionState {
  csrfToken: string | null
  isInitialized: boolean
  isInitializing: boolean
  sessionId?: string
  expiresAt?: string
}

export const sessionStore = atom<SessionState>({
  csrfToken: null,
  isInitialized: false,
  isInitializing: false
})

export function setCSRFToken(token: string, sessionId?: string, expiresAt?: string): void {
  sessionStore.set({
    ...sessionStore.get(),
    csrfToken: token,
    sessionId,
    expiresAt,
    isInitialized: true,
    isInitializing: false
  })
}
```

### 3. Session Validation

Every API request (except session initialization) requires session validation:

1. The session cookie is automatically included in requests via `credentials: 'include'`
2. The CSRF token is added to request headers:

```typescript
// In src/lib/api/apiClient.ts
async function apiFetch<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const { skipAuthCheck = false, ...fetchOptions } = options
  const csrfToken = getCSRFToken()

  // Check for CSRF token if required
  if (!skipAuthCheck && !csrfToken && endpoint !== '/session/init') {
    throw new SessionError({
      message: 'CSRF token not available',
      userMessage: 'Your session has expired. Please refresh the page.',
      context: { endpoint }
    })
  }

  // Add CSRF token and standard headers
  const headers = new Headers(fetchOptions.headers)
  if (csrfToken) {
    headers.set('X-CSRF-Token', csrfToken)
  }

  // ...rest of the function
}
```

On the backend, each request is validated by:
1. Checking for a valid session cookie
2. Validating the CSRF token matches the one stored for the session
3. Verifying the session hasn't expired

### 4. Session Expiration & Cleanup

Sessions expire after 24 hours. The frontend tracks this and displays the remaining time to users:

```typescript
// In src/components/features/session/SessionManager.tsx
useEffect(() => {
  if (!sessionStartTime) return

  // Session TTL is 24 hours (86400 seconds)
  const SESSION_TTL = 24 * 60 * 60

  const updateTimeRemaining = () => {
    const now = new Date()
    const elapsedSeconds = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000)
    const remaining = Math.max(0, SESSION_TTL - elapsedSeconds)
    setTimeRemaining(remaining)
  }

  // Update immediately
  updateTimeRemaining()

  // Then update every minute
  const timerId = setInterval(updateTimeRemaining, 60 * 1000)

  return () => clearInterval(timerId)
}, [sessionStartTime])
```

### 5. Manual Session Close

Users can manually close their session, which:
1. Calls the `/session/close` API endpoint
2. Clears local session data
3. Removes server-side session data and associated files

```typescript
// In src/components/features/session/CloseSession.tsx
const handleCloseSession = async () => {
  // Confirm with user
  if (!window.confirm('Are you sure you want to close this session? All conversion data will be cleared.')) {
    return
  }

  try {
    setIsClosing(true)

    // Call API to close session
    const response = await closeSession()

    if (response.success) {
      // Clear local session data
      clearSession()
      toast.success('Session closed successfully')

      // Reload page to start fresh
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } else {
      throw new Error('Failed to close session')
    }
  } catch (error) {
    console.error('Session close error:', error)
    toast.error('Failed to close session. Please try again.')
  } finally {
    setIsClosing(false)
  }
}
```

## CSRF Protection Implementation

Cross-Site Request Forgery (CSRF) protection is implemented using a dual-token pattern:

### 1. Token Generation

During session initialization, the server generates:
1. A session ID stored in an HttpOnly cookie (inaccessible to JavaScript)
2. A CSRF token returned in the response body (stored in JavaScript memory)

### 2. Token Validation

For each API request:
1. The browser automatically sends the session cookie
2. The frontend code manually adds the CSRF token in the `X-CSRF-Token` header
3. The backend validates that the CSRF token matches the one stored for the session

This approach protects against CSRF attacks because:
- Attackers can't access the HttpOnly session cookie
- Attackers can't know the CSRF token (not stored in cookies)
- Both tokens must match for a request to be processed

## Security Considerations

### 1. Cookie Security

Session cookies are configured with:
- `HttpOnly`: Prevents JavaScript access
- `Secure`: Only sent over HTTPS
- `SameSite=Strict`: Prevents cross-site requests

### 2. Session Data Minimization

The session stores minimal data:
- Session ID
- CSRF token
- Job IDs associated with the session

No personal information is stored in the session.

### 3. Resource Isolation

Each session's files are stored in isolated directories:
```
/shared/tmp/{session_id}/{job_id}/
```

This prevents one session from accessing another session's files.

### 4. Short-lived Download Tokens

File downloads use short-lived tokens (10-minute TTL) to prevent unauthorized access:

```typescript
// In src/lib/api/apiClient.ts
export async function getDownloadToken(jobId: string): Promise<ApiResponse<DownloadTokenResponse>> {
  try {
    return await apiFetch<DownloadTokenResponse>('/download_token', {
      method: 'POST',
      body: JSON.stringify({ job_id: jobId })
    })
  } catch (error) {
    handleError(error, { context: { action: 'getDownloadToken', jobId } })
    throw error
  }
}
```

## Frontend Session Management Components

### 1. SessionManager Component

The `SessionManager` component provides users with:
- Visual indication of session status
- Time remaining before session expiration
- Number of conversions in the current session
- Option to manually close the session
- Option to export conversion history

```jsx
<SessionManager
  onSessionClosed={() => {/* handle session close */}}
  onSessionError={(error) => {/* handle errors */}}
  showExportOption={true}
/>
```

### 2. CloseSession Component

The `CloseSession` component provides a button to close the current session:

```jsx
<CloseSession variant="default" />
```

Variants include:
- `default`: Standard button with icon
- `minimal`: Text-only version for footer
- `text`: Text-only with different styling

## Best Practices for Developers

1. **Always check session state** before making API requests
2. **Handle session expiration** gracefully with user feedback
3. **Respect the session lifecycle** - don't store sensitive data beyond the session
4. **Use the API client** for all requests to ensure proper CSRF handling
5. **Provide clear session feedback** to users about session status and expiration

## Troubleshooting

### Common Issues

1. **CSRF Token Mismatch**
   - Check browser console for CSRF errors
   - Verify the token is being correctly stored and sent
   - Session may have expired on the server

2. **Session Cookie Missing**
   - Ensure cookies are not being blocked by browser settings
   - Check for proper HTTPS configuration
   - Verify cookie settings match between frontend and backend

3. **Session Initialization Failure**
   - Check network connectivity
   - Verify backend session service is running
   - Look for CORS issues in development environments

## Conclusion

The TrustyConvert session management system provides a secure, privacy-focused approach to handling user sessions without requiring authentication. By combining HttpOnly cookies, CSRF tokens, and proper resource isolation, it maintains strong security guarantees while providing a seamless user experience. 
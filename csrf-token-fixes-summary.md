# CSRF Token Handling Improvements

## Overview

This document summarizes the changes made to fix issues with CSRF token handling in the TrustyConvert frontend application. The main problems addressed were:

1. Duplicate CSRF tokens in request headers
2. Unnecessary session initializations
3. Inconsistent token synchronization between memory and cookies
4. Mismatches between CSRF tokens in headers and cookies

## Key Changes

### 1. Centralized Session Management

Created a new `sessionManager` service that centralizes all session and CSRF token management:

- Maintains an in-memory copy of the CSRF token as the source of truth
- Provides methods to synchronize tokens between memory and cookies
- Prevents duplicate session initializations
- Implements robust error handling and retry logic

```typescript
// src/lib/services/sessionManager.ts
let currentCsrfToken: string | null = null

export function hasCsrfToken(): boolean {
	const cookieToken = getCsrfTokenFromCookie()
	return cookieToken !== null && cookieToken === currentCsrfToken
}

export function getCsrfToken(): string | null {
	return currentCsrfToken
}

export function synchronizeTokenFromCookie(): boolean {
	const cookieToken = getCsrfTokenFromCookie()
	if (cookieToken) {
		currentCsrfToken = cookieToken
		return true
	}
	return false
}

export async function initSession(): Promise<boolean> {
	// Only initialize if we don't have a valid token
	if (hasCsrfToken() && sessionInitialized) {
		return true
	}

	// Implementation details...
}
```

### 2. Fixed Duplicate CSRF Headers

Updated the API client to ensure CSRF headers are never duplicated:

```typescript
// src/lib/api/apiClient.ts
function getCsrfRequestHeaders(): Record<string, string> {
	const csrfToken = sessionManager.getCsrfToken()
	if (!csrfToken) {
		return {}
	}

	// Only include one version of the header
	const headerName = apiConfig.csrfTokenHeader || 'X-CSRF-Token'
	return {
		[headerName]: csrfToken
	}
}
```

Also improved the `makeRequest` function to use the Headers API for better header management:

```typescript
// src/lib/api/apiClient.ts
async function makeRequest<T>(
	endpoint: string,
	options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
	// ...
	if (!skipCsrfCheck && fetchOptions.method && fetchOptions.method !== 'GET') {
		const csrfHeaders = getCsrfRequestHeaders()

		// Create headers object if it doesn't exist
		const headers = new Headers(fetchOptions.headers || {})

		// Add CSRF header - ensure we don't add duplicate headers
		if (csrfHeaders[apiConfig.csrfTokenHeader]) {
			headers.set(apiConfig.csrfTokenHeader, csrfHeaders[apiConfig.csrfTokenHeader])
		}

		// Update the fetchOptions with our headers
		fetchOptions.headers = headers
	}
	// ...
}
```

### 3. Improved Cookie Management

Enhanced the cookie handling in `csrfUtils.ts` to ensure tokens are properly set:

```typescript
// src/lib/utils/csrfUtils.ts
export function setCsrfTokenCookie(token: string): void {
	// ...
	// Try multiple approaches to ensure the cookie is set correctly
	let cookieString = `${CSRF_COOKIE_NAME}=${token};path=/;expires=${expires.toUTCString()}`

	// Add Secure attribute if using HTTPS
	if (isSecure) {
		cookieString += ';Secure;SameSite=None'
	} else {
		cookieString += ';SameSite=Lax'
	}

	// Set the cookie
	document.cookie = cookieString

	// Also try alternative approaches if the first one fails
	setTimeout(() => {
		// Check if the cookie was set correctly
		const storedToken = getCsrfTokenFromCookie()
		if (storedToken !== token) {
			// Try alternative approaches...
		}
	}, 50)
}
```

### 4. Optimized Session Initialization

Updated components to avoid unnecessary session initializations:

#### SessionProvider

```typescript
// src/components/providers/SessionProvider.tsx
useEffect(() => {
	const initializeSession = async () => {
		// First synchronize any existing token from cookie to memory
		sessionManager.synchronizeTokenFromCookie()

		// Only initialize a new session if we don't have a valid token
		if (!sessionManager.hasCsrfToken()) {
			await sessionManager.initSession()
		}
	}

	initializeSession()
}, [])
```

#### ConversionFlow

```typescript
// src/components/features/conversion/ConversionFlow.tsx
const handleConvert = useCallback(
	async () => {
		// First synchronize any existing token from cookie to memory
		sessionManager.synchronizeTokenFromCookie()

		// Ensure we have a session before proceeding
		if (!sessionManager.hasCsrfToken()) {
			// Initialize session only if needed
			const success = await sessionManager.initSession()
			// ...
		}
		// ...
	},
	[
		/* dependencies */
	]
)
```

#### API Client

```typescript
// src/lib/api/client.ts
uploadFile: async (file: File, jobId?: string) => {
  try {
    // First synchronize any existing token from cookie to memory
    sessionManager.synchronizeTokenFromCookie();

    // Ensure we have a valid session before uploading
    if (!sessionManager.hasCsrfToken()) {
      await sessionManager.ensureSession();
    }
    // ...
  }
}
```

### 5. Better Visibility Change Handling

Improved the handling of page visibility changes to maintain session validity:

```typescript
// src/components/providers/SessionProvider.tsx
useEffect(() => {
	const handleVisibilityChange = () => {
		if (document.visibilityState === 'visible') {
			// First synchronize any existing token from cookie to memory
			sessionManager.synchronizeTokenFromCookie()

			// Only reset the session if we don't have a valid token
			if (!sessionManager.hasCsrfToken()) {
				sessionManager.resetSession()
			}
		}
	}

	document.addEventListener('visibilitychange', handleVisibilityChange)
	// ...
}, [])
```

## Benefits of Changes

1. **Improved Reliability**: CSRF tokens are now properly synchronized between memory and cookies
2. **Reduced Network Requests**: Sessions are only initialized when necessary
3. **Consistent Headers**: No more duplicate CSRF token headers in requests
4. **Better User Experience**: Fewer session errors during the conversion process
5. **Enhanced Maintainability**: Centralized session management makes the code easier to maintain

## Testing

These changes were tested in various scenarios:

- Initial page load
- Page refresh
- Returning to the page after being away
- Multiple file conversions
- Network interruptions

All tests confirmed that CSRF tokens are now properly handled throughout the application.

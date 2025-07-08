# Download Implementation

## Overview

TrustyConvert implements a token-based download approach that follows best practices for efficient file downloads. This document explains how the download flow works and the key components involved.

## Download Flow

1. **Job Completion**: When a conversion job completes, the system requests a download token from the API.
2. **Token-Based Download**: We use a token-based approach where the browser handles the download directly.
3. **Frontend Redirect**: Instead of directly navigating to the API domain (which causes cross-origin authentication issues), we redirect to a frontend page that handles the download with proper authentication.

## Key Components

### 1. JobPollingService

The `jobPollingService` monitors job status and handles the transition from conversion to download:

- Polls the API for job status updates
- When a job is completed, requests a download token
- Triggers the appropriate callbacks with the download token and URL

### 2. useEnhancedDownload Hook

This hook implements the improved download flow:

- Ensures session is initialized before requesting download token
- Includes CSRF token in the download_token request
- Redirects to a frontend download page that handles authentication properly

### 3. Download Page

A dedicated page that handles the authenticated download process:

- Accepts a download token via URL parameters
- Ensures session is initialized
- Fetches the file with proper authentication headers
- Shows download status and provides retry options

### 4. ConversionFlow Component

The main component that orchestrates the conversion and download process:

- Manages the state transitions between upload, conversion, and download
- Handles the UI updates based on job status
- Uses the enhanced download hook for secure downloads

## Implementation Details

### Token Request

```typescript
// Request a download token
const response = await apiClient.getDownloadToken(jobId)

// Extract the token (handling different response formats)
const downloadToken =
	response.download_token ||
	response.downloadToken ||
	response.data?.download_token ||
	response.data?.downloadToken
```

### Frontend Download Page Redirect

```typescript
// Generate frontend download page URL
const downloadPageUrl = `/download?token=${encodeURIComponent(token)}&job=${encodeURIComponent(jobId)}`

// Redirect to the download page
window.location.href = downloadPageUrl
```

### Authenticated Download Request

```typescript
// Ensure session is initialized
await sessionManager.ensureSession()

// Create headers with CSRF token
const headers = new Headers()
if (csrfToken) {
	headers.set(apiConfig.csrfTokenHeader, csrfToken)
}

// Fetch file with credentials included
const response = await fetch(downloadUrl, {
	credentials: 'include',
	headers
})
```

## Cross-Origin Authentication

The enhanced download flow addresses cross-origin authentication issues by:

1. **Avoiding Direct API Navigation**: Instead of directly navigating to the API domain, we redirect to a frontend page
2. **Ensuring Session Initialization**: We ensure the session is initialized before requesting a download token
3. **Including Credentials**: We include credentials and CSRF tokens in all API requests
4. **Proper Error Handling**: We provide clear feedback and retry options for failed downloads

## Important Security Notes

- Tokens are **single-use** and bound to the user's session
- Tokens expire after a short time (typically 10 minutes)
- Using a token more than once will result in an error
- The download page handles authentication properly and securely

## Troubleshooting

If downloads aren't working:

- Check that the session is properly initialized
- Ensure CSRF tokens are included in API requests
- Verify that credentials are included in fetch requests
- Check browser console for any errors during the download process
- Confirm that the server is correctly validating the session during download

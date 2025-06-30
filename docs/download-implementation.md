# Download Implementation

## Overview

TrustyConvert implements a token-based download approach that follows best practices for efficient file downloads. This document explains how the download flow works and the key components involved.

## Download Flow

1. **Job Completion**: When a conversion job completes, the system requests a download token from the API.
2. **Token-Based Download**: We use a token-based approach where the browser handles the download directly.
3. **Browser Redirection**: The browser is redirected to the download URL with the token, allowing the server to stream the file directly.

## Key Components

### 1. JobPollingService

The `jobPollingService` monitors job status and handles the transition from conversion to download:

- Polls the API for job status updates
- When a job is completed, requests a download token
- Triggers the appropriate callbacks with the download token and URL

### 2. useFileDownload Hook

This hook implements the recommended download flow:

- Requests a download token from the API
- Generates a download URL with the token
- Redirects the browser to the download URL using a programmatic click
- Lets the server handle streaming directly to the browser

### 3. ConversionFlow Component

The main component that orchestrates the conversion and download process:

- Manages the state transitions between upload, conversion, and download
- Handles the UI updates based on job status
- Provides a download button for user-initiated downloads

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

### Download Initiation

```typescript
// Generate download URL
const downloadUrl = apiClient.getDownloadUrl(downloadToken)

// Initiate download via browser redirection
const a = document.createElement('a')
a.href = downloadUrl
a.download = '' // Let the server set the filename
document.body.appendChild(a)
a.click()
a.remove()
```

## Important Security Notes

- Tokens are **single-use** and bound to the user's session
- Tokens expire after a short time (typically 10 minutes)
- Using a token more than once will result in an error

## Troubleshooting

If downloads aren't working:

- Check that the token extraction is handling the correct response format
- Ensure the token is only being used once
- Verify that we're using browser redirection, not fetch/XHR
- Check browser console for any errors during the download process
- Confirm that the server is correctly validating the session during download

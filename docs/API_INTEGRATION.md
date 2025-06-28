# API Integration Guide

This document explains how the TrustyConvert frontend integrates with the backend API for file conversion.

## Overview

The frontend interacts with the backend API for file conversion using a RESTful API with session-based authentication and CSRF protection. The integration follows these key principles:

1. **Session Management**: All API requests are made within a session that's initialized before any file operations.
2. **CSRF Protection**: Uses the Double Submit Cookie pattern with CSRF tokens for all state-changing requests.
3. **File Upload Flow**: File upload, conversion, status polling, and download are handled as separate steps.
4. **Error Handling**: Comprehensive error handling with correlation IDs for debugging.

## Key Components

### 1. API Client (`src/lib/api/apiClient.ts`)

Low-level API client that handles:
- Session initialization and CSRF token management
- File upload and conversion requests
- Job status polling
- Download token generation
- Error handling and retries

### 2. API Client Wrapper (`src/lib/api/client.ts`)

High-level wrapper around the API client that:
- Provides a simpler interface for components
- Handles data transformation
- Adds convenience methods like `startConversion`

### 3. Session Management

- `SessionProvider`: Initializes the session when the app loads
- `useSessionInitializer`: Hook that handles session initialization and CSRF token management
- CSRF utilities: Handles CSRF token extraction from cookies and error handling

### 4. Conversion Hooks

- `useConversion`: Main hook for the file conversion flow
- `useFileConversion`: More detailed hook for managing the conversion process
- `useConversionStatus`: Hook for polling job status

## Typical Flow

1. **Session Initialization**:
   ```typescript
   // Happens automatically via SessionProvider
   const { isInitialized } = useSessionInitializer();
   ```

2. **File Upload and Conversion**:
   ```typescript
   const { convertFile, isProcessing } = useConversion();
   
   // Later, when user selects a file and format
   const result = await convertFile(file, targetFormat);
   
   if (result.success) {
     // Show download link
     window.location.href = result.downloadUrl;
   }
   ```

3. **Manual Flow (if needed)**:
   ```typescript
   // 1. Upload file
   const uploadResult = await apiClient.uploadFile(file, jobId);
   
   // 2. Start conversion
   const convertResult = await apiClient.convertFile(jobId, targetFormat);
   
   // 3. Poll for status
   let status;
   do {
     await new Promise(resolve => setTimeout(resolve, 2000));
     status = await apiClient.getConversionStatus(jobId);
   } while (status.status !== 'completed' && status.status !== 'failed');
   
   // 4. Get download token
   const downloadToken = await apiClient.getDownloadToken(jobId);
   
   // 5. Generate download URL
   const downloadUrl = apiClient.getDownloadUrl(downloadToken.download_token);
   ```

## Testing

Use the `test-api-connection.js` script to test the API integration:

```bash
node test-api-connection.js
```

This script tests:
1. CORS configuration
2. Session initialization
3. File upload
4. File conversion
5. Job status retrieval
6. Download token generation
7. Session closure

## Error Handling

The API integration includes comprehensive error handling:

- Network errors (timeout, connection issues)
- API errors (validation, server errors)
- Session errors (expired sessions, CSRF issues)

All errors include:
- User-friendly messages
- Detailed error information for debugging
- Correlation IDs for tracing issues across frontend and backend

## Security Considerations

1. **CSRF Protection**: All state-changing requests include CSRF tokens.
2. **Credentials**: All requests include credentials (cookies).
3. **Download Tokens**: Single-use, short-lived tokens for file downloads.
4. **Session Cleanup**: Sessions are closed when no longer needed.

## Configuration

API configuration is centralized in `src/lib/api/config.ts` and can be customized using environment variables:

- `PUBLIC_API_URL`: Base URL for the API
- `PUBLIC_API_DOMAIN`: Domain for the API (for CORS)
- `PUBLIC_FRONTEND_DOMAIN`: Domain for the frontend (for CORS)

## Troubleshooting

Common issues and solutions:

1. **CORS Errors**: Ensure the backend has the correct CORS configuration.
2. **Session Initialization Failures**: Check network connectivity and SSL certificate configuration.
3. **Upload Failures**: Check file size limits and supported formats.
4. **Conversion Errors**: Check the job status for detailed error messages.

For detailed debugging, check the browser console and network tab for request/response details. 
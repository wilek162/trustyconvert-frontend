# TrustyConvert API Integration

This document explains how the TrustyConvert frontend integrates with the backend API.

## Overview

The TrustyConvert frontend communicates with the backend API to perform file conversions. The API integration follows the specifications outlined in the [API Integration Guide](../API_INTEGRATION_GUIDE.md).

## API Client Architecture

The API client is implemented in a modular, layered approach:

1. **Low-level API Client** (`src/lib/api/apiClient.ts`):
   - Handles direct communication with the API endpoints
   - Manages CSRF tokens and session cookies
   - Implements error handling, retries, and timeouts
   - Provides type-safe API responses

2. **High-level API Client** (`src/lib/api/client.ts`):
   - Provides a simplified interface for components and hooks
   - Abstracts away implementation details
   - Handles common workflows (e.g., upload + convert in one call)

3. **React Hooks** (`src/lib/hooks/useApi.ts`, `src/lib/hooks/useFileConversion.ts`, etc.):
   - Integrate API calls with React's state management
   - Provide loading, error, and data states
   - Handle polling for job status

## Key API Endpoints

The API client interacts with the following endpoints:

- **Session Management**:
  - `GET /api/session/init`: Initialize a session and get CSRF token
  - `POST /api/session/close`: Close a session and clean up resources

- **File Operations**:
  - `POST /api/upload`: Upload a file for conversion
  - `POST /api/convert`: Start a conversion job
  - `GET /api/job_status`: Check the status of a conversion job
  - `POST /api/download_token`: Get a token for downloading a converted file
  - `GET /api/download`: Download a converted file using a token

- **Format Information**:
  - `GET /api/convert/formats`: Get supported conversion formats

## Security Considerations

The API integration implements several security measures:

1. **CSRF Protection**:
   - CSRF tokens are obtained from `/api/session/init`
   - Tokens are sent in the `X-CSRF-Token` header for all state-changing requests

2. **Cookie Handling**:
   - All requests include credentials (cookies)
   - Session cookies are managed by the browser

3. **CORS Configuration**:
   - Requests are configured with the appropriate CORS settings
   - The frontend domain is whitelisted on the backend

4. **Secure Downloads**:
   - Single-use, time-limited download tokens
   - Proper Content-Disposition headers for secure file downloads

## Error Handling

The API client implements comprehensive error handling:

1. **Network Errors**:
   - Timeout handling
   - Retry logic for transient errors
   - SSL/TLS error handling for development environments

2. **API Errors**:
   - Structured error responses with error codes and messages
   - Validation error handling
   - Session expiration detection and handling

3. **User Feedback**:
   - User-friendly error messages
   - Correlation IDs for debugging and support

## Testing API Integration

To test the API integration:

1. **Test Script**:
   - Run `./test-api.sh` to test the API connection
   - This script tests all key endpoints and workflows

2. **JavaScript Test**:
   - Run `node test-api-connection.js` for a more detailed test
   - This script provides more verbose output and handles edge cases

## Development vs. Production

The API client behaves differently in development and production:

1. **Development**:
   - Can use self-signed certificates (with appropriate warnings)
   - More verbose logging
   - Environment variables from `.env`

2. **Production**:
   - Strict SSL certificate validation
   - Minimal logging (errors only)
   - Environment variables from deployment configuration
   - No mock data

## Troubleshooting

Common issues and their solutions:

1. **CORS Errors**:
   - Ensure the frontend domain is whitelisted in the backend configuration
   - Check that credentials are included in requests

2. **SSL/TLS Errors**:
   - In development, ensure self-signed certificates are properly configured
   - In production, ensure certificates are valid and trusted

3. **Session Errors**:
   - Check that session initialization is called before other operations
   - Verify CSRF token handling

4. **File Upload Issues**:
   - Check file size limits
   - Verify supported file formats
   - Ensure proper multipart/form-data formatting 
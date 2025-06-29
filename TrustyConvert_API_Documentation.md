# TrustyConvert API Documentation for Frontend Developers

## Overview

This document provides detailed information on the TrustyConvert API endpoints that frontend developers should use when integrating with the backend service. The API enables secure file conversion with session management, file uploads, conversions, and downloads.

## API Base URLs

- **Production API**: `https://api.trustyconvert.com`
- **Development API**: `https://localhost` (when running locally)

## CORS Configuration

The API is configured to allow cross-origin requests from:

- **Production**: `https://trustyconvert.com`, `https://www.trustyconvert.com`, and `https://localhost:4322` (for development)
- **Development**: `https://localhost:4322`

All cookies are configured with:
- `secure: true` (requires HTTPS)
- `samesite: None` (allows cross-origin requests)
- `httponly: true` for session cookies (not accessible via JavaScript)
- `httponly: false` for CSRF token cookies (accessible via JavaScript)

## Authentication & Security

### Session Management

All non-GET endpoints require a valid session and CSRF token. The session is managed through cookies, and the CSRF token must be included in request headers.

- **Session Cookie**: `trustyconvert_session` (HTTP-only, secure)
- **CSRF Cookie**: `csrftoken` (JavaScript-accessible, secure)
- **CSRF Header**: `X-CSRF-Token`

## Rate Limiting

The API implements the following rate limits:

- **Upload**: 3 requests per minute per IP
- **Convert**: 5 requests per minute per IP
- **Download**: 10 requests per minute per IP

When rate limits are exceeded, the API returns a `429 Too Many Requests` status code.

## Standard Response Format

All API endpoints return responses in a standardized format:

### Success Response

```json
{
  "success": true,
  "data": {
    // Endpoint-specific data
  },
  "correlation_id": "unique-correlation-id"
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "type": "ErrorType",
    "details": {}
  },
  "correlation_id": "unique-correlation-id"
}
```

Common error types:
- `ValidationError`: Invalid input parameters
- `SessionValidationError`: Invalid or missing session
- `CSRFValidationError`: Invalid or missing CSRF token
- `ResourceNotFound`: Requested resource not found
- `FileValidationError`: File validation failed
- `VirusDetectedError`: Virus detected in uploaded file
- `TaskLimitExceeded`: Too many active tasks
- `ServerError`: Internal server error

## API Endpoints

### Session Management

#### Initialize Session

Creates a new session and sets session and CSRF cookies.

- **Endpoint**: `GET /session/init`
- **Authentication**: None
- **Request**: No parameters required
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "success": true,
      "data": {
        "id": "session-uuid",
        "csrf_token": "csrf-token-value",
        "expires_at": ""
      },
      "correlation_id": "unique-correlation-id"
    }
    ```
  - Cookies:
    - `trustyconvert_session`: Session ID (HTTP-only, secure)
    - `csrftoken`: CSRF token (JavaScript-accessible, secure)

#### Close Session

Closes the current session and cleans up associated resources.

- **Endpoint**: `POST /session/close`
- **Authentication**: Session cookie + CSRF token
- **Request**:
  - Headers:
    - `X-CSRF-Token`: CSRF token from cookie
  - Body: None
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "success": true,
      "data": {
        "message": "Session closed successfully"
      },
      "correlation_id": "unique-correlation-id"
    }
    ```
  - Cookies: Session and CSRF cookies are cleared

#### Refresh CSRF Token

Refreshes the CSRF token for the current session.

- **Endpoint**: `POST /session/csrf`
- **Authentication**: Session cookie + CSRF token
- **Request**:
  - Headers:
    - `X-CSRF-Token`: Current CSRF token from cookie
  - Body: None
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "success": true,
      "data": {
        "csrf_token": "new-csrf-token-value"
      },
      "correlation_id": "unique-correlation-id"
    }
    ```
  - Cookies: `csrftoken` is updated with the new token

### File Operations

#### Get Supported Formats

Retrieves a list of all supported conversion formats.

- **Endpoint**: `GET /convert/formats`
- **Authentication**: None
- **Request**: No parameters required
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "success": true,
      "data": {
        "data": [
          {
            "id": "pdf",
            "name": "PDF Conversion",
            "description": "Convert documents to and from PDF format",
            "inputFormats": ["docx", "doc", "rtf", "txt", "odt", "html"],
            "outputFormats": ["pdf"],
            "maxSize": 104857600,
            "features": ["text extraction", "image preservation"]
          },
          // Additional formats...
        ]
      },
      "correlation_id": "unique-correlation-id"
    }
    ```

#### Upload File

Uploads a file for conversion.

- **Endpoint**: `POST /upload`
- **Authentication**: Session cookie + CSRF token
- **Rate Limit**: 3 requests per minute per IP
- **Request**:
  - Headers:
    - `X-CSRF-Token`: CSRF token from cookie
  - Form Data:
    - `file`: The file to upload (multipart/form-data)
    - `job_id`: Client-generated UUID to track this upload/conversion job
- **Response**:
  - Status: `201 Created`
  - Body:
    ```json
    {
      "success": true,
      "data": {
        "job_id": "client-generated-uuid",
        "status": "uploaded"
      },
      "correlation_id": "unique-correlation-id"
    }
    ```

#### Convert File

Queues a file conversion task.

- **Endpoint**: `POST /convert`
- **Authentication**: Session cookie + CSRF token
- **Rate Limit**: 5 requests per minute per IP
- **Request**:
  - Headers:
    - `X-CSRF-Token`: CSRF token from cookie
    - `Content-Type`: `application/json`
  - Body:
    ```json
    {
      "job_id": "client-generated-uuid",
      "target_format": "pdf",
      "source_format": "docx" // Optional, will be detected from uploaded file if not provided
    }
    ```
- **Response**:
  - Status: `202 Accepted`
  - Body:
    ```json
    {
      "success": true,
      "data": {
        "job_id": "client-generated-uuid",
        "task_id": "server-generated-task-uuid",
        "status": "queued"
      },
      "correlation_id": "unique-correlation-id"
    }
    ```

#### Check Job Status

Checks the status of a conversion job.

- **Endpoint**: `GET /job_status`
- **Authentication**: Session cookie
- **Request**:
  - Query Parameters:
    - `job_id`: The job ID to check
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "success": true,
      "data": {
        "job_id": "client-generated-uuid",
        "status": "completed", // Possible values: "uploaded", "queued", "processing", "completed", "failed"
        "created_at": "2023-06-15T10:30:00Z",
        "updated_at": "2023-06-15T10:32:00Z",
        "original_filename": "document.docx",
        "source_format": "docx",
        "target_format": "pdf",
        "file_size": 1024000,
        "error": null // Contains error message if status is "failed"
      },
      "correlation_id": "unique-correlation-id"
    }
    ```

#### Create Download Token

Creates a short-lived token for downloading a converted file.

- **Endpoint**: `POST /download_token`
- **Authentication**: Session cookie + CSRF token
- **Request**:
  - Headers:
    - `X-CSRF-Token`: CSRF token from cookie
    - `Content-Type`: `application/json`
  - Body:
    ```json
    {
      "job_id": "client-generated-uuid"
    }
    ```
- **Response**:
  - Status: `201 Created`
  - Body:
    ```json
    {
      "success": true,
      "data": {
        "download_token": "secure-download-token",
        "expires_at": "2023-06-15T11:00:00Z"
      },
      "correlation_id": "unique-correlation-id"
    }
    ```

#### Download File

Downloads a converted file using a token.

- **Endpoint**: `GET /download`
- **Authentication**: Download token (no session required)
- **Rate Limit**: 10 requests per minute per IP
- **Request**:
  - Query Parameters:
    - `token`: Download token from `/download_token` endpoint
- **Response**:
  - Status: `200 OK`
  - Headers:
    - `Content-Type`: MIME type of the file
    - `Content-Disposition`: `attachment; filename="converted-file.pdf"`
  - Body: Binary file content

### Health Check

#### System Health Check

Checks the health of the API and its dependencies.

- **Endpoint**: `GET /health`
- **Authentication**: None
- **Request**: No parameters required
- **Response**:
  - Status: `200 OK`
  - Body:
    ```json
    {
      "success": true,
      "data": {
        "status": "healthy", // or "degraded", "unhealthy"
        "version": "1.0.0",
        "services": {
          "redis": {
            "status": "healthy",
            "latency_ms": 5
          },
          "storage": {
            "status": "healthy",
            "available_space_mb": 10240
          },
          "antivirus": {
            "status": "healthy",
            "version": "0.103.5"
          }
        },
        "timestamp": "2023-06-15T10:30:00Z"
      },
      "correlation_id": "unique-correlation-id"
    }
    ```

## Error Handling

When an error occurs, the API returns an appropriate HTTP status code along with a standardized error response:

```json
{
  "success": false,
  "error": {
    "message": "Detailed error message",
    "type": "ErrorType",
    "details": {
      // Additional error details if available
    }
  },
  "correlation_id": "unique-correlation-id"
}
```

### Common Error Scenarios

1. **Session Expired or Invalid**
   - Status: `401 Unauthorized`
   - Error Type: `SessionValidationError`
   - Solution: Initialize a new session with `/session/init`

2. **Missing or Invalid CSRF Token**
   - Status: `403 Forbidden`
   - Error Type: `CSRFValidationError`
   - Solution: Use the current CSRF token from the cookie or refresh it with `/session/csrf`

3. **Rate Limit Exceeded**
   - Status: `429 Too Many Requests`
   - Error Type: `RateLimitExceeded`
   - Solution: Wait and retry after the rate limit window expires

4. **File Validation Failed**
   - Status: `400 Bad Request`
   - Error Type: `FileValidationError`
   - Solution: Check file size, format, and content

5. **Virus Detected**
   - Status: `400 Bad Request`
   - Error Type: `VirusDetectedError`
   - Solution: Scan the file locally before uploading

6. **Job or Resource Not Found**
   - Status: `404 Not Found`
   - Error Type: `ResourceNotFound`
   - Solution: Verify job ID or resource identifier

7. **Too Many Active Tasks**
   - Status: `429 Too Many Requests`
   - Error Type: `TaskLimitExceeded`
   - Solution: Wait for current tasks to complete before starting new ones

## Best Practices

1. **Session Management**
   - Initialize a session when the application starts
   - Close the session when the user is done
   - Handle session expiration gracefully

2. **CSRF Protection**
   - Include the CSRF token in all non-GET requests
   - Refresh the token if it expires

3. **Resource Efficiency**
   - Process one conversion at a time per session
   - Poll job status with reasonable intervals (2-3 seconds)
   - Implement timeout handling for long-running conversions

4. **Security**
   - Validate file types and sizes on the frontend before uploading
   - Never store sensitive information in localStorage or sessionStorage
   - Use HTTPS for all API calls

5. **Error Handling**
   - Implement proper error handling for all API calls
   - Display user-friendly error messages
   - Automatically retry on certain errors (e.g., session expiration)

## File Conversion Flow

The typical file conversion flow involves the following steps:

1. **Initialize Session**: Call `/session/init` to create a new session
2. **Upload File**: Call `/upload` with the file and a client-generated job ID
3. **Convert File**: Call `/convert` with the job ID and target format
4. **Check Status**: Poll `/job_status` until the job is completed or failed
5. **Get Download Token**: Call `/download_token` to get a download token
6. **Download File**: Use the token to download the converted file from `/download`
7. **Close Session**: Call `/session/close` when done to clean up resources

## Conclusion

This API documentation provides all the necessary information for frontend developers to integrate with the TrustyConvert API. By following these guidelines, you can ensure a secure, efficient, and user-friendly file conversion experience. 
# TrustyConvert API Documentation

This document outlines the API response types and how the frontend should interact with the TrustyConvert API.

## Table of Contents
- [Standard Response Format](#standard-response-format)
- [Error Handling](#error-handling)
- [Common Response Types](#common-response-types)
- [Supported Formats](#supported-formats)
- [Frontend Integration Guidelines](#frontend-integration-guidelines)
- [Security Requirements](#security-requirements)

## Standard Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data specific to the endpoint
  },
  "correlation_id": "unique-request-id"
}
```

### Error Response
```json
{
  "success": false,
  "data": {
    "error": "ErrorType",
    "message": "Human-readable error message",
    "correlation_id": "unique-request-id",
    "details": {
      // Optional additional error details
    }
  }
}
```

## Error Handling

### Common Error Types

1. **ValidationError** (400)
   - Invalid input data
   - Malformed request body
   - Missing required fields

2. **FileValidationError** (400)
   - Invalid file type
   - Corrupted file
   - File validation failures

3. **MaxFileSizeExceededError** (413)
   - File size exceeds allowed limit

4. **UnsupportedFormatError** (400)
   - Requested conversion format not supported

5. **RateLimitExceededError** (429)
   - Too many requests in a given time period

6. **SessionValidationError** (401)
   - Invalid or expired session
   - Session authentication failed

7. **CSRFValidationError** (403)
   - Missing or invalid CSRF token

8. **DownloadTokenError** (401)
   - Invalid or expired download token

9. **ConversionError** (500)
   - Error during file conversion process

10. **ServiceUnavailableError** (503)
    - Backend service temporarily unavailable

## Common Response Types

### JobResponse
```typescript
{
  job_id: string;
  status: string;
  original_filename: string;
  created_at: string;
  updated_at: string;
  converted_path?: string;
  output_size?: number;
  completed_at?: string;
  conversion_time?: number;
  download_token?: string;
  error_message?: string;
  error_type?: string;
  failed_at?: string;
}
```

### DownloadStatusResponse
```typescript
{
  job_id: string;
  status: string;
  is_ready: boolean;
  has_error: boolean;
  error_message: string;
  progress: number;
}
```

### FileValidationResult
```typescript
{
  filename: string;
  sanitized_filename: string;
  mime_type: string;
  extension: string;
  size: number;
  is_valid: boolean;
  validation_errors: string[];
}
```

## Supported Formats

The API supports various file formats through different conversion services. You can get the complete list of supported formats by calling:

```
GET /api/convert/formats
```

### Image Conversion Service (Pillow)
- **Input Formats**: jpg, jpeg, png, gif, bmp, tiff, webp
- **Output Formats**: jpg, jpeg, png, gif, bmp, tiff, webp, pdf
- **Max File Size**: 50MB
- **Features**: resize, optimize, compress

### Document Conversion Service (Gotenberg)
- **Input Formats**: pdf, docx, doc, odt, rtf, txt, pptx, ppt, odp, xlsx, xls, ods, html, md, csv
- **Output Formats**: pdf
- **Max File Size**: 100MB
- **Features**: merge, bookmarks, metadata

### PDF Processing Service (Poppler)
- **Input Formats**: pdf
- **Output Formats**: txt, html, jpg, jpeg, png
- **Max File Size**: 100MB
- **Features**: extract_text, extract_images, metadata

### PDF to DOCX Service
- **Input Formats**: pdf
- **Output Formats**: docx
- **Max File Size**: 50MB
- **Features**: preserve_layout, extract_tables

### Format Response Schema
```typescript
{
  success: boolean;
  data: {
    data: Array<{
      id: string;          // Service identifier
      name: string;        // Service name
      description: string; // Service description
      inputFormats: string[];
      outputFormats: string[];
      maxSize: number;     // Maximum file size in bytes
      features: string[];  // Supported features
    }>;
  };
  correlation_id: string;
}
```

## Frontend Integration Guidelines

### Required Headers
All requests must include:
1. `X-CSRF-Token` header for state-changing operations (POST, PUT, DELETE)
2. `Content-Type: application/json` for JSON requests
3. `Cookie` header to maintain session

### Basic Flow Implementation
```javascript
async function handleFileConversion(file, targetFormat) {
  try {
    // 1. Initialize session
    const csrfToken = await initSession();
    
    // 2. Upload file
    const uploadId = await uploadFile(file, csrfToken);
    
    // 3. Start conversion
    const jobId = await convertFile(uploadId, targetFormat, csrfToken);
    
    // 4. Poll for completion
    let status;
    do {
      await new Promise(resolve => setTimeout(resolve, 1000));
      status = await checkDownloadStatus(jobId, csrfToken);
      // Update UI with status.progress
    } while (!status.is_ready && !status.has_error);
    
    if (status.has_error) {
      throw new Error(`Conversion failed: ${status.error_message}`);
    }
    
    // 5. Generate download token
    const downloadToken = await getDownloadToken(jobId, csrfToken);
    
    // 6. Get download info
    const downloadInfo = await getDownloadInfo(downloadToken);
    
    // 7. Start download
    startDownload(downloadInfo.download_url);
    
  } catch (error) {
    // Handle errors appropriately
    console.error('Error:', error);
  }
}
```

### Error Handling Best Practices
1. Always check the `success` field in responses
2. Handle rate limiting with exponential backoff
3. Implement retry logic for transient errors
4. Show user-friendly error messages
5. Log correlation IDs for debugging

## Security Requirements

1. **HTTPS Only**
   - All API requests must be made over HTTPS
   - Non-HTTPS requests will be rejected

2. **CSRF Protection**
   - Obtain CSRF token from `/api/session/csrf`
   - Include token in `X-CSRF-Token` header
   - Refresh token when expired

3. **Session Management**
   - Initialize session before operations
   - Handle session expiration gracefully
   - Store session cookies securely

4. **File Upload Security**
   - Validate file types before upload
   - Respect maximum file size limits
   - Handle upload errors appropriately

5. **Rate Limiting**
   - Implement request throttling
   - Handle 429 responses with backoff
   - Show appropriate user feedback

## Best Practices

1. **Correlation IDs**
   - Store correlation IDs from responses
   - Include in error reports
   - Use for request tracing

2. **Progress Tracking**
   - Show upload progress
   - Display conversion status
   - Indicate download progress

3. **Error Recovery**
   - Implement auto-retry for failed uploads
   - Allow manual retry for failed conversions
   - Preserve user input during errors

4. **User Experience**
   - Show clear progress indicators
   - Display meaningful error messages
   - Provide cancel/retry options 
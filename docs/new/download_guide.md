# Frontend Download Integration Guide

This guide explains how to properly handle file downloads in the frontend application when integrating with the TrustyConvert API.

## Table of Contents
- [Overview](#overview)
- [Download Flow](#download-flow)
- [Security Considerations](#security-considerations)
- [API Endpoints](#api-endpoints)
- [Implementation Examples](#implementation-examples)
- [Best Practices](#best-practices)

## Overview

The download system is designed to be:
- Secure: Uses short-lived tokens and session validation
- Efficient: Streams files directly from storage
- User-friendly: Supports progress tracking and status updates

## Download Flow

1. **Check Download Status**
   ```typescript
   GET /api/download_status?job_id={job_id}
   ```
   - Polls job status until `is_ready` is true
   - Monitors progress via `progress` field
   - Checks for errors via `has_error` and `error_message`

2. **Generate Download Token**
   ```typescript
   POST /api/download_token
   {
     "job_id": "your-job-id"
   }
   ```
   - Requires CSRF token in `X-CSRF-Token` header
   - Returns a short-lived download token

3. **Get Download Info** (Optional)
   ```typescript
   GET /api/download_info?token={token}
   ```
   - Returns file metadata before download
   - Includes size, type, and filename

4. **Start Download**
   ```typescript
   GET /api/download?token={token}
   ```
   - Streams file directly to browser
   - Automatically handles content disposition

## Security Considerations

1. **Session Management**
   - Session cookie is automatically included
   - HttpOnly cookie prevents XSS attacks
   - Secure flag ensures HTTPS-only transmission

2. **CSRF Protection**
   - Required for token generation
   - Not needed for actual download (GET request)
   - Token must be included in X-CSRF-Token header

3. **Download Tokens**
   - Short-lived (typically 15 minutes)
   - Single-use only
   - Bound to specific session and job

## API Endpoints

### 1. Check Download Status
```typescript
interface DownloadStatusResponse {
  job_id: string;
  status: string;
  is_ready: boolean;
  has_error: boolean;
  error_message: string;
  progress: number;
}
```

### 2. Generate Download Token
```typescript
interface DownloadTokenResponse {
  download_token: string;
  expires_at: string;
}
```

### 3. Get Download Info
```typescript
interface DownloadInfoResponse {
  filename: string;
  size: number;
  content_type: string;
  download_url: string;
  job_id: string;
  token: string;
  expires_at: string;
}
```

## Implementation Examples

### Basic Download Button Component
```tsx
import React from 'react';

interface DownloadButtonProps {
  jobId: string;
  token: string;
}

function DownloadButton({ jobId, token }: DownloadButtonProps) {
  const handleDownload = () => {
    // Construct secure URL
    const downloadUrl = `/api/download?job_id=${encodeURIComponent(jobId)}&token=${encodeURIComponent(token)}`;

    // Create an invisible <a> element and trigger click
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = ''; // Not required, but improves behavior in some browsers
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button onClick={handleDownload}>
      Download File
    </button>
  );
}

export default DownloadButton;
```

### Advanced Download Handler with Progress
```tsx
import React, { useState, useEffect } from 'react';

interface DownloadHandlerProps {
  jobId: string;
}

function DownloadHandler({ jobId }: DownloadHandlerProps) {
  const [status, setStatus] = useState<'waiting' | 'ready' | 'error'>('waiting');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [downloadToken, setDownloadToken] = useState('');

  // Poll for status
  useEffect(() => {
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/download_status?job_id=${jobId}`);
        const data = await response.json();
        
        if (data.success) {
          setProgress(data.data.progress);
          
          if (data.data.has_error) {
            setStatus('error');
            setError(data.data.error_message);
          } else if (data.data.is_ready) {
            setStatus('ready');
            // Get download token
            const tokenResponse = await fetch('/api/download_token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': getCsrfToken(), // Get from your state management
              },
              body: JSON.stringify({ job_id: jobId }),
            });
            const tokenData = await tokenResponse.json();
            if (tokenData.success) {
              setDownloadToken(tokenData.data.download_token);
            }
          }
        }
      } catch (err) {
        setStatus('error');
        setError('Failed to check download status');
      }
    };

    if (status === 'waiting') {
      const interval = setInterval(pollStatus, 1000);
      return () => clearInterval(interval);
    }
  }, [jobId, status]);

  if (status === 'error') {
    return <div className="error">Error: {error}</div>;
  }

  if (status === 'waiting') {
    return (
      <div className="progress">
        Converting... {Math.round(progress * 100)}%
        <div className="progress-bar" style={{ width: `${progress * 100}%` }} />
      </div>
    );
  }

  return (
    <DownloadButton jobId={jobId} token={downloadToken} />
  );
}

export default DownloadHandler;
```

## Best Practices

1. **Download Initiation**
   - Use `<a>` tag or programmatic click
   - Never use `fetch()` for file downloads
   - Don't open in new window unless needed

2. **Error Handling**
   - Check download status before generating token
   - Handle token expiration gracefully
   - Provide clear error messages to users

3. **Progress Tracking**
   - Show conversion progress during waiting
   - Indicate when download is ready
   - Handle failed conversions appropriately

4. **User Experience**
   - Provide visual feedback during conversion
   - Show file size before download starts
   - Allow cancellation of long-running conversions

5. **Security**
   - Never store tokens in localStorage
   - Use HTTPS for all requests
   - Validate file types and sizes client-side

6. **Performance**
   - Use appropriate polling intervals
   - Clean up intervals when component unmounts
   - Handle large files efficiently

## Common Issues and Solutions

1. **Token Expiration**
   ```typescript
   // Check token expiration before download
   if (new Date(expiresAt) < new Date()) {
     // Request new token
     const newToken = await refreshDownloadToken(jobId);
     startDownload(newToken);
   }
   ```

2. **Download Failures**
   ```typescript
   // Implement retry logic
   const MAX_RETRIES = 3;
   const retryDownload = async (attempt = 0) => {
     try {
       await startDownload(token);
     } catch (error) {
       if (attempt < MAX_RETRIES) {
         await new Promise(resolve => setTimeout(resolve, 1000));
         return retryDownload(attempt + 1);
       }
       throw error;
     }
   };
   ```

3. **Progress Tracking**
   ```typescript
   // Implement exponential backoff for status polling
   const backoff = Math.min(1000 * Math.pow(2, retryCount), 10000);
   setTimeout(checkStatus, backoff);
   ``` 
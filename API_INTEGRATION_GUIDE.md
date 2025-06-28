# TrustyConvert API Integration Guide (Frontend)

This document explains how the frontend should interact with the TrustyConvert backend API. It covers authentication/session management, file upload, conversion, job status, download, security, and error handling.

---

## API Base URL & CORS
- **Base URL:** `/api` (e.g., `https://your-backend-domain/api`)
- **CORS:** Only whitelisted origins (see backend config) are allowed. Credentials (cookies) are required for all requests.
- **All requests must include credentials** (cookies) for session and CSRF management.

---

## Session & CSRF Token Management

### 1. Initialize Session
- **Endpoint:** `GET /api/session/init`
- **What it does:** Creates a new session, sets session and CSRF cookies.
- **Frontend action:**
  - Call this endpoint before any upload/conversion.
  - Store the `csrftoken` cookie value for use in headers.
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "id": "<session_id>",
      "csrf_token": "<csrf_token>",
      "expires_at": ""
    },
    "correlation_id": "..."
  }
  ```

### 2. CSRF Token Usage
- **Header:** `X-CSRF-Token: <csrf_token>` (from cookie or `/session/init` response)
- **Required for:** All state-changing requests (upload, convert, download token, etc.)

### 3. Close Session
- **Endpoint:** `POST /api/session/close`
- **What it does:** Cleans up session, deletes cookies and files.

---

## File Upload
- **Endpoint:** `POST /api/upload`
- **Headers:**
  - `X-CSRF-Token: <csrf_token>`
- **Form Data:**
  - `file`: File to upload
  - `job_id`: UUID4 string (frontend generates, used to track the job)
- **Response:**
  ```json
  {
    "success": true,
    "data": { "job_id": "<job_id>", "status": "uploaded" },
    "correlation_id": "..."
  }
  ```
- **Notes:**
  - Rate-limited (3/minute per IP)
  - Virus scan and validation are performed
  - Requires valid session and CSRF token

---

## File Conversion
- **Endpoint:** `POST /api/convert`
- **Headers:**
  - `X-CSRF-Token: <csrf_token>`
- **Body (JSON):**
  ```json
  {
    "job_id": "<job_id>",
    "target_format": "pdf", // e.g. "pdf", "docx", etc.
    "source_format": "docx" // optional, usually auto-detected
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": { "job_id": "<job_id>", "status": "queued" },
    "correlation_id": "..."
  }
  ```
- **Notes:**
  - Only one active conversion per session at a time
  - Requires valid session and CSRF token

---

## Get Supported Formats
- **Endpoint:** `GET /api/convert/formats`
- **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "pillow",
        "name": "Image Converter",
        "inputFormats": ["jpg", "png", ...],
        "outputFormats": ["pdf", ...],
        ...
      },
      ...
    ],
    "correlation_id": "..."
  }
  ```

---

## Job Status
- **Endpoint:** `GET /api/job_status?job_id=<job_id>`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "job_id": "<job_id>",
      "status": "completed", // or "processing", "failed", etc.
      ...
    },
    "correlation_id": "..."
  }
  ```
- **Notes:**
  - Use this to poll for conversion status

---

## Download Flow
### 1. Get Download Token
- **Endpoint:** `POST /api/download_token`
- **Headers:**
  - `X-CSRF-Token: <csrf_token>`
- **Body (JSON):**
  ```json
  { "job_id": "<job_id>" }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": { "download_token": "...", "expires_at": "..." },
    "correlation_id": "..."
  }
  ```

### 2. Download File
- **Endpoint:** `GET /api/download?token=<download_token>`
- **Response:**
  - File download (served via NGINX X-Accel-Redirect)
  - Proper `Content-Disposition` and security headers
- **Notes:**
  - Token is single-use and short-lived
  - Requires valid session

---

## Error Handling
- **Standard error response:**
  ```json
  {
    "success": false,
    "error": "ErrorType",
    "message": "Description of the error",
    "correlation_id": "...",
    "details": [ { "field": "...", "message": "..." } ]
  }
  ```
- **Frontend should display user-friendly messages and handle correlation IDs for support/debugging.**

---

## Security & Integration Best Practices
- Always call `/session/init` before any file operation.
- Always send `X-CSRF-Token` header for state-changing requests.
- Use `withCredentials: true` (or equivalent) in fetch/XHR/Axios to send cookies.
- Handle rate limits and show appropriate messages to users.
- Never expose download tokens or session IDs in URLs or logs.
- Clean up sessions with `/session/close` when done.
- Use the `/convert/formats` endpoint to dynamically populate supported formats.

---

## Example Flow (Pseudocode)
```js
// 1. Initialize session
await fetch('/api/session/init', { credentials: 'include' });
const csrfToken = getCookie('csrftoken');

// 2. Upload file
const formData = new FormData();
formData.append('file', file);
formData.append('job_id', jobId);
await fetch('/api/upload', {
  method: 'POST',
  body: formData,
  headers: { 'X-CSRF-Token': csrfToken },
  credentials: 'include',
});

// 3. Convert file
await fetch('/api/convert', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  },
  body: JSON.stringify({ job_id: jobId, target_format: 'pdf' }),
  credentials: 'include',
});

// 4. Poll job status
await fetch(`/api/job_status?job_id=${jobId}`, { credentials: 'include' });

// 5. Get download token
await fetch('/api/download_token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  },
  body: JSON.stringify({ job_id: jobId }),
  credentials: 'include',
});

// 6. Download file
window.location = `/api/download?token=${downloadToken}`;
```

---

## Contact Backend Team
For questions, issues, or to request new features, contact the backend team or check the API docs at `/api/docs`. 
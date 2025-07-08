# API Specification & Session/File Lifecycle for Secure File Conversion App

This document defines the complete API, response format, session/file lifecycle, and frontend integration guidelines for a secure and scalable file conversion application.

## Standard API Response Format

All endpoints return JSON responses in the following format:

### Success
```json
{
  "success": true,
  "data": { /* Response data or null */ }
}
```

### Error
```json
{
  "success": false,
  "data": {
    "error": "ValidationError",
    "message": "File size exceeds 100MB limit."
  }
}
```

## API Endpoints

### GET /session/init

Initializes a secure, anonymous session.

**Frontend Use:** Call on page load if no session cookie is found.

**Response:**
```json
{
  "success": true,
  "data": {
    "csrf_token": "string"
  }
}
```

**Backend Behavior:**
- Generates session_id (set in HttpOnly, Secure cookie)
- Creates Redis key `session:{session_id}` with TTL = 24h
- Stores CSRF token

### POST /upload

Uploads a file with validation.

**Headers:**
- `X-CSRF-Token`: Must match token from `/session/init`

**FormData:**
- `file`: Actual file
- `job_id`: UUIDv4 from frontend

**Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "string",
    "status": "uploaded"
  }
}
```

**Backend Behavior:**
- Validates session & CSRF
- Validates file: size, type, MIME, ClamAV scan
- Saves file to `/shared/tmp/{session_id}/uploads/{job_id}.ext`
- Creates Redis entry `session:{session_id}:jobs:{job_id}`

### POST /convert

Queues a file conversion task.

**Headers:**
- `X-CSRF-Token`

**Body:**
```json
{
  "job_id": "string",
  "target_format": "docx"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "string",
    "task_id": "string",
    "status": "processing"
  }
}
```

**Backend Behavior:**
- Queues Celery task
- Stores task_id in Redis

### GET /job_status?job_id=...

Polls for job status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "completed",
    "error_message": null,
    "completed_at": "2025-06-09T13:00Z"
  }
}
```

### POST /download_token

Issues a short-lived token to download the converted file.

**Headers:**
- `X-CSRF-Token`

**Body:**
```json
{
  "job_id": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "download_token": "string"
  }
}
```

**Backend Behavior:**
- Verifies session and job
- Creates Redis key `download_token:{token}` (TTL = 10 minutes)

### GET /download?token=...

Securely downloads file using token.

**Backend Behavior:**
- Validates token from Redis
- Verifies session_id in cookie matches token
- Serves file via Nginx using X-Accel-Redirect

### POST /session/close

Allows user to manually clean up their session.

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Session closed and cleaned up."
  }
}
```

## Session and File Cleanup Strategy

### 1. Automatic Cleanup via Redis TTL
- Redis keys (e.g., `session:{session_id}`) expire after 24h
- File watcher or cleanup worker deletes: `/shared/tmp/{session_id}` on Redis session key expiration

### 2. Proactive Cleanup (`/session/close`)
**Deletes:**
- Redis keys: `session:*`, `session:*:jobs:*`, `download_token:*`
- Files: `/shared/tmp/{session_id}`

### 3. Post-Conversion Cleanup
- Original uploaded files are deleted after conversion
- Converted files remain until session ends (for multiple downloads or retry)

## Frontend Integration Notes

### Session Setup
```javascript
// On page load
if (!sessionCookieExists()) {
  const { csrf_token } = await fetch('/session/init');
  storeCSRF(csrf_token);
}
```

### File Upload
```javascript
const job_id = uuidv4();
uploadFile(file, job_id); // send to /upload
```

### Conversion
```javascript
await fetch('/convert', {
  body: JSON.stringify({ job_id, target_format: "docx" }),
  headers: { "X-CSRF-Token": csrfToken }
});
```

### Polling
```javascript
setInterval(() => {
  fetch(`/job_status?job_id=${job_id}`).then(updateStatus);
}, 3000);
```

### IndexedDB Storage Example
```json
{
  "job_id": "...",
  "original_filename": "...",
  "target_format": "...",
  "status": "completed",
  "timestamp": "...",
  "download_token": "..."
}
```

### Download
```javascript
const token = await fetch('/download_token', { body: { job_id } });
fetch(`/download?token=${token}`);
```

## Tokens & IDs Overview

| Token/ID | Purpose | Where Stored | Lifespan |
|----------|---------|--------------|----------|
| session_id | Anonymous session ID | Secure Cookie | 24h |
| csrf_token | CSRF protection | Redis + Frontend memory | 24h |
| job_id | Upload/conversion job tracking | Redis + IndexedDB | 24h |
| task_id | Celery conversion task ID | Redis | 24h |
| download_token | One-time download access token | Redis | 10 minutes |

This spec ensures a secure, scalable, and maintainable approach to file conversion with full session lifecycle management and a clean frontend/backend interface.
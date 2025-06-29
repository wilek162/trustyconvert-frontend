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

## React Hooks & SSR/CSR Hydration Best Practices

When integrating API functionality with React components in an Astro project, special care must be taken to handle React hooks correctly, especially with components that need to work with both server-side rendering (SSR) and client-side rendering (CSR).

### Rules for React Hooks in API Integration

1. **Never conditionally call hooks:** React hooks must be called in the same order on every render. This is especially important when handling client-side only functionality.

   ```jsx
   // ❌ INCORRECT: Conditional hook call
   const dropzoneProps = isClient
     ? useDropzone({ /* config */ })
     : { /* fallback values */ };

   // ✅ CORRECT: Always call the hook with conditional config
   const dropzoneConfig = useMemo(() => ({
     onDrop: isClient ? handleDrop : () => {},
     // other config...
     disabled: !isClient
   }), [isClient, handleDrop]);
   
   const dropzoneProps = useDropzone(dropzoneConfig);
   ```

2. **Handle hydration mismatches:** For components that use browser APIs (like file upload), render a simplified version during SSR and hydrate on the client.

3. **Use `useEffect` for client-side initialization:** Set up API connections and event listeners only after the component has mounted.

4. **Use `useMemo` for conditional configurations:** Instead of conditionally calling hooks, always call them but conditionally configure their behavior.

5. **Use feature detection:** Check for browser capabilities before using them.

   ```jsx
   const [isClient, setIsClient] = useState(false);
   
   useEffect(() => {
     setIsClient(true);
   }, []);
   ```

### Example: File Upload Component Integration

```jsx
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { apiClient } from '@/lib/api/client';

function FileUploadComponent() {
  // Track client-side rendering
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    
    // Initialize API session
    apiClient.initSession().catch(err => {
      console.error('Failed to initialize session:', err);
    });
    
    // Clean up session on unmount
    return () => {
      apiClient.closeSession().catch(err => {
        console.error('Failed to close session:', err);
      });
    };
  }, []);
  
  // Always define callbacks even if they won't be used during SSR
  const handleDrop = useCallback((files) => {
    if (!isClient) return;
    // Handle file upload with API
  }, [isClient]);
  
  // Always call hooks, but with conditional config
  const dropzoneConfig = useMemo(() => ({
    onDrop: handleDrop,
    disabled: !isClient,
    // other config
  }), [handleDrop, isClient]);
  
  const { getRootProps, getInputProps } = useDropzone(dropzoneConfig);
  
  // Render appropriate UI based on client/server
  if (!isClient) {
    return <div>Loading file uploader...</div>;
  }
  
  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <p>Drag & drop files here</p>
    </div>
  );
}
```

By following these best practices, you'll avoid common issues like React hook rule violations and hydration mismatches when integrating with the API.

---

## Static Site Deployment on Cloudflare Pages

TrustyConvert frontend is designed to work as a static site deployed on Cloudflare Pages. This section covers specific considerations for static deployment.

### Static vs. SSR Mode in Astro

When deploying to Cloudflare Pages, we recommend using Astro's **static mode** (`output: 'static'` in `astro.config.mjs`) for several reasons:

1. **Better performance:** Static sites on Cloudflare Pages benefit from global CDN distribution and edge caching.
2. **Simpler deployment:** No need for server runtime configuration.
3. **Lower costs:** Static sites typically have lower hosting costs than SSR applications.

```js
// astro.config.mjs
export default defineConfig({
  output: 'static', // Recommended for Cloudflare Pages deployment
  // other config...
});
```

### Handling API Requests in Static Mode

Since static sites don't have server-side capabilities, all API interactions must happen client-side:

1. **Client-side API initialization:** Always initialize API sessions after the component has mounted.

   ```jsx
   useEffect(() => {
     // Only run on the client
     apiClient.initSession();
   }, []);
   ```

2. **Avoid `Astro.request.headers`:** As seen in console warnings, `Astro.request.headers` is not available in static mode. Instead:

   ```jsx
   // ❌ INCORRECT: Using server-side features in static mode
   export const prerender = false; // Don't use this in static mode
   const userLang = Astro.request.headers.get('accept-language');
   
   // ✅ CORRECT: Use client-side detection
   <script>
     // Run in the browser
     const userLang = navigator.language;
     document.documentElement.lang = userLang;
   </script>
   ```

3. **Use client-side routing:** For dynamic routes, implement client-side routing or generate static paths at build time.

### Cloudflare Pages Configuration

For optimal deployment on Cloudflare Pages:

1. **Build command:** Set the build command to `npm run build` or `pnpm build`.
2. **Output directory:** Set to `dist` (Astro's default output directory).
3. **Environment variables:** Configure your API endpoint in Cloudflare Pages environment variables.
   ```
   PUBLIC_API_URL=https://api.trustyconvert.com/api
   PUBLIC_FRONTEND_DOMAIN=https://trustyconvert.com
   ```

4. **Custom domains:** Configure your custom domain in the Cloudflare Pages dashboard.

### API CORS Configuration

When hosting on Cloudflare Pages, ensure your API CORS configuration includes your Cloudflare Pages domains:

- Production domain: `https://your-site.pages.dev`
- Custom domain: `https://your-custom-domain.com`
- Preview branches: `https://*.your-site.pages.dev`

### Handling Preview Deployments

Cloudflare Pages automatically creates preview deployments for branches and PRs. Configure your API to accept these origins:

```js
// Backend CORS configuration
const allowedOrigins = [
  'https://trustyconvert.com',
  'https://www.trustyconvert.com',
  'https://trustyconvert.pages.dev',
  'https://*.trustyconvert.pages.dev' // For preview deployments
];
```

### Addressing Astro Static Mode Warnings

If you see warnings like:

```
[WARN] `Astro.request.headers` was used when rendering the route `src/pages/index.astro'`.
```

You have two options:

1. **Preferred for Cloudflare Pages:** Keep static mode and remove server-side code:
   - Replace server-side header detection with client-side alternatives
   - Use client-side initialization for features that need request data

2. **Alternative (not recommended for Cloudflare Pages):** Switch to SSR mode:
   ```js
   // astro.config.mjs
   export default defineConfig({
     output: 'server',
     adapter: cloudflare(), // Requires @astrojs/cloudflare adapter
   });
   ```
   Note: This requires additional configuration and may not be optimal for performance.

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
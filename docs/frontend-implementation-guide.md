# TrustyConvert Frontend Implementation Guide

## Overview

TrustyConvert is a secure file conversion web application built with Astro, React, and TailwindCSS. This document provides a comprehensive overview of the frontend implementation, focusing on core components, security features, and the conversion workflow.

## Architecture

The application follows a component-based architecture with:

1. **Astro Pages** - Server-rendered pages with React islands
2. **React Components** - Client-side interactive components
3. **Global Stores** - State management using nanostores
4. **API Client** - Centralized API communication

### Key Technologies

- **Astro** - Main framework for static/server rendering
- **React** - Component library for interactive UI elements
- **TailwindCSS** - Utility-first CSS framework
- **nanostores** - Lightweight state management
- **React Query** - API data fetching and caching
- **react-dropzone** - File upload handling

## Core Components

### 1. Session Management

The session management system handles secure user sessions without requiring authentication:

#### SessionManager Component

Located at `src/components/features/session/SessionManager.tsx`, this component:
- Displays session status (active/inactive)
- Shows time remaining before session expiry
- Provides session cleanup functionality
- Offers conversion history export

```jsx
<SessionManager 
  onSessionClosed={() => {/* handle session close */}} 
  onSessionError={(error) => {/* handle errors */}}
  showExportOption={true} 
/>
```

#### Session Store

Located at `src/lib/stores/session.ts`, this store:
- Maintains CSRF tokens
- Tracks session initialization status
- Provides session expiry information

```typescript
import { getCSRFToken, getInitialized, setInitializing } from '@/lib/stores/session'

// Check if session is initialized
if (getInitialized()) {
  // Session is ready
}

// Get CSRF token for API requests
const csrfToken = getCSRFToken()
```

### 2. File Conversion Flow

The conversion flow is orchestrated by the `ConversionFlow` component at `src/components/features/conversion/ConversionFlow.tsx`:

#### Workflow Steps:

1. **Session Initialization** - Establishes secure session with backend
2. **File Upload** - Validates and uploads file
3. **Format Selection** - Chooses target conversion format
4. **Conversion** - Processes file on the server
5. **Status Polling** - Monitors conversion progress
6. **Download** - Securely retrieves converted file

#### UploadZone Component

Located at `src/components/features/upload/UploadZone.tsx`, this component:
- Provides drag-and-drop file upload
- Validates files (size, type)
- Shows upload progress
- Handles upload errors

```jsx
<UploadZone
  onFileUploaded={(jobId, file) => {/* handle successful upload */}}
  onError={(error) => {/* handle upload error */}}
  maxFileSize={100 * 1024 * 1024} // 100MB
  acceptedFormats={{
    'application/pdf': ['.pdf'],
    'image/*': ['.jpg', '.jpeg', '.png']
  }}
  showProgress={true}
/>
```

#### FormatSelector Component

Allows users to select the target conversion format based on the uploaded file type.

#### ConversionStats Component

Shows statistics about the conversion process, including file size, conversion time, and success rate.

### 3. API Integration

The API client (`src/lib/api/apiClient.ts`) provides a centralized interface for backend communication:

#### Key Features:

- **Session Management** - Handles CSRF tokens and session cookies
- **Error Handling** - Standardized error responses and handling
- **Request Retries** - Automatic retry for failed requests
- **Progress Tracking** - Upload progress monitoring

#### API Endpoints:

1. `initSession()` - Creates new secure session
2. `uploadFile(file, jobId)` - Uploads file for conversion
3. `convertFile(jobId, targetFormat)` - Initiates file conversion
4. `getJobStatus(jobId)` - Polls for conversion status
5. `getDownloadToken(jobId)` - Gets secure download token
6. `closeSession()` - Cleans up session and files

#### React Query Hooks:

Custom hooks in `src/lib/hooks/useApi.ts` provide React Query integration:

```typescript
// Example: Upload a file
const uploadMutation = useFileUpload({
  onSuccess: (response) => {
    // Handle successful upload
  },
  onError: (error) => {
    // Handle error
  }
})

// Start upload
uploadMutation.mutate({ file, jobId })
```

## Security Features

### CSRF Protection

All API requests (except session initialization) require a CSRF token:

1. Token is obtained during session initialization
2. Stored in the session store
3. Automatically included in API requests via the `X-CSRF-Token` header

### Session Lifecycle

1. **Creation** - On application load via `/session/init`
2. **Validation** - Every API request validates the session
3. **Expiration** - Sessions expire after 24 hours
4. **Cleanup** - Resources are cleaned up via `/session/close` or automatic expiration

### File Security

1. Files are validated for size and type before upload
2. Unique job IDs prevent file access conflicts
3. Short-lived download tokens protect converted files
4. Files are automatically cleaned up when sessions expire

## Application Initialization

The application initialization process is handled in `src/lib/app.ts`:

1. **Common Initialization** - `initializeApp()` sets up monitoring and mocks
2. **Browser Initialization** - `initializeBrowser()` sets up:
   - Error handlers
   - IndexedDB for job persistence
   - Fetch interceptors for CORS
   - Session initialization
   - Service worker registration

## Styling and Branding

The application follows the TrustyConvert brand guidelines:

- **Colors** - Primary teal (#4ECDC4), deep navy (#2C3E50)
- **Typography** - Inter for body text, Poppins for headings
- **Components** - Custom UI components with consistent styling
- **Responsive Design** - Mobile-first approach with tailored layouts

## Development Workflow

### Environment Setup

1. Install dependencies: `pnpm install`
2. Start development server: `pnpm dev`
3. Build for production: `pnpm build`

### Key Configuration Files

- `.env` - Environment variables
- `astro.config.mjs` - Astro configuration
- `tailwind.config.mjs` - TailwindCSS theme settings
- `tsconfig.json` - TypeScript configuration

## Common Issues and Solutions

### CORS Issues in Development

The application includes CORS handling for local development:

1. Fetch interceptor in `src/lib/app.ts` adds CORS headers
2. Vite dev server proxy in `astro.config.mjs` handles CORS for API requests
3. `NODE_TLS_REJECT_UNAUTHORIZED=0` may be needed for local HTTPS development

### Session Management

If users experience session issues:

1. Check browser console for CSRF or session errors
2. Verify cookies are being set correctly
3. Ensure the backend session endpoints are functioning

### File Upload Problems

For file upload issues:

1. Verify file size limits match backend configuration
2. Check MIME type validation
3. Ensure proper CSRF token handling

## Next Steps for Development

Future development could focus on:

1. **Enhanced Error Handling** - More detailed error messages and recovery options
2. **Offline Support** - Progressive enhancement for offline capabilities
3. **Authenticated Users** - Adding optional user accounts for premium features
4. **Batch Processing** - Supporting multiple file conversions
5. **Additional Formats** - Expanding supported conversion formats

## Conclusion

The TrustyConvert frontend provides a secure, user-friendly file conversion experience. By following the patterns established in this codebase, developers can maintain and extend the application while preserving its security and usability principles. 
# TrustyConvert Frontend Integration Prompts

## Prompt 2: Core Upload & Conversion Functionality

Building on the established TrustyConvert foundation, implement the core file upload and conversion functionality. This prompt focuses on creating the main interactive components while maintaining security and following the documented API flow.

### Requirements:

**Components to Create:**

1. **FileUploadZone (React Component):**

   - Drag & drop interface with visual feedback
   - File validation (size: 100MB max, type checking)
   - Progress indication during upload
   - Error handling with user-friendly messages
   - Integration with session/CSRF management

2. **ConversionInterface (React Component):**

   - Format selection dropdown (PDF, DOCX, XLSX, etc.)
   - Conversion initiation button
   - Real-time status polling every 3 seconds
   - Progress visualization (uploaded → processing → completed)
   - Error state handling with retry option

3. **DownloadManager (React Component):**
   - Secure token-based download initiation
   - Download button with loading states
   - Multiple download support (if user wants to download again)
   - Automatic cleanup notification

**API Integration Flow:**

```typescript
// Exact sequence to implement:
1. Initialize session: GET /session/init
2. Upload file: POST /upload (with CSRF token)
3. Start conversion: POST /convert (with job_id and target_format)
4. Poll status: GET /job_status?job_id=... (every 3s)
5. Get download token: POST /download_token (when completed)
6. Download file: GET /download?token=... (browser download)
```

**State Management Requirements:**

1. **Upload Store Enhancement:**

```typescript
interface UploadState {
	files: Map<string, FileUploadData>
	activeUploads: string[]
	conversionQueue: string[]
	completedJobs: string[]
}

interface FileUploadData {
	jobId: string
	originalFilename: string
	targetFormat: string
	status: JobStatus
	uploadProgress: number
	taskId?: string
	errorMessage?: string
	downloadToken?: string
	completedAt?: string
}
```

2. **IndexedDB Integration:**
   - Store job history for user convenience
   - Persist conversion preferences
   - Handle browser refresh gracefully

**File Validation Logic:**

- Client-side MIME type checking using File API
- Size validation before upload attempt
- Extension whitelist enforcement
- Visual feedback for invalid files

**Error Handling Strategy:**

- Network errors: Retry with exponential backoff
- Validation errors: Clear user guidance
- Conversion failures: Show specific error from API
- Session expiry: Auto-redirect to reinitialize

**UI/UX Requirements:**

- Loading states for all async operations
- Disabled states to prevent duplicate submissions
- Clear visual hierarchy for multi-step process
- Mobile-responsive design with touch-friendly targets
- Accessibility support (ARIA labels, keyboard navigation)

**Security Implementation:**

- Validate CSRF token before any API call
- Clear sensitive data on component unmount
- No tokens in console.log or browser dev tools
- Proper error messages that don't leak system info

**Integration Points:**

- Use existing API client from lib/api.ts
- Integrate with session store for CSRF management
- Update upload store with real-time status changes
- Handle session cleanup via existing patterns

**Performance Considerations:**

- Debounce file validation during drag operations
- Cancel pending status polls when component unmounts
- Optimize re-renders with proper React optimization patterns
- Lazy load conversion format options

**Deliverables:**

1. Complete FileUploadZone with drag/drop and validation
2. ConversionInterface with format selection and status polling
3. DownloadManager with secure token handling
4. Enhanced upload store with complete state management
5. IndexedDB utility for job persistence
6. Integration of all components in home page
7. Comprehensive error handling and loading states

Create production-ready components that handle edge cases gracefully and provide excellent user experience while maintaining strict security standards.

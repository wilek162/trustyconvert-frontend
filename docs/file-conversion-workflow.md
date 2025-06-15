# TrustyConvert File Conversion Workflow

This document explains the complete file conversion workflow in TrustyConvert, from file upload to download, including component interactions, API calls, and error handling.

## Workflow Overview

The file conversion process follows these key steps:

1. **Session Initialization** - Establish secure session with backend
2. **File Selection & Validation** - Select and validate file for conversion
3. **File Upload** - Upload file to server with progress tracking
4. **Format Selection** - Choose target conversion format
5. **Conversion Process** - Convert file on server
6. **Status Polling** - Monitor conversion progress
7. **Download** - Securely retrieve converted file

## Component Architecture

The conversion flow is orchestrated by the `ConversionFlow` component (`src/components/features/conversion/ConversionFlow.tsx`), which integrates several sub-components:

```
ConversionFlow
├── SessionManager
├── UploadZone
├── FormatSelector
├── ConversionProgress
└── DownloadButton
```

## Detailed Workflow Steps

### 1. Session Initialization

Before any file operations, a secure session must be established:

```typescript
// In ConversionFlow.tsx
useEffect(() => {
  const initialize = async () => {
    try {
      // Check if session is already initialized
      if (getInitialized()) {
        setSessionInitialized(true)
        return
      }

      setInitializing(true)
      const response = await initSession()

      if (response.success && response.data.csrf_token) {
        setSessionInitialized(true)
      } else {
        setError('Failed to initialize secure session')
      }
    } catch (error) {
      console.error('Session initialization error:', error)
      setError('Could not establish secure session. Please try refreshing the page.')
    }
  }

  initialize()
}, [])
```

This calls the `initSession()` function from the API client, which:
- Makes a GET request to `/session/init`
- Stores the CSRF token in the session store
- Sets the session cookie (handled by the browser)

### 2. File Selection & Validation

The `UploadZone` component handles file selection and validation:

```jsx
<UploadZone
  onFileUploaded={handleFileUploaded}
  onError={handleUploadError}
  maxFileSize={FILE_UPLOAD.MAX_SIZE}
  acceptedFormats={FILE_UPLOAD.MIME_TYPES}
  showProgress={true}
/>
```

When a user drops or selects a file, the component:

1. Validates the file size and type:

```typescript
// In UploadZone.tsx
const onDrop = useCallback(
  async (acceptedFiles: File[]) => {
    // Reset state
    setFile(null)
    setValidationResult(null)
    setUploadProgress(0)

    // No files
    if (acceptedFiles.length === 0) {
      return
    }

    const selectedFile = acceptedFiles[0]

    // Validate file
    const result = validateFile(selectedFile, {
      maxSize: maxFileSize,
      allowedTypes: Object.values(acceptedFormats).flat()
    })

    setValidationResult(result)

    if (!result.isValid) {
      if (result.error && onError) {
        onError(result.error)
      }
      return
    }

    setFile(selectedFile)
  },
  [maxFileSize, acceptedFormats, onError]
)
```

2. Shows validation errors if needed
3. Prepares the file for upload

### 3. File Upload

When the user clicks "Upload File", the upload process begins:

```typescript
// In UploadZone.tsx
const handleUpload = async () => {
  if (!file) return

  // Check if session is initialized
  const csrfToken = getCSRFToken()
  if (!csrfToken) {
    handleError('Session not initialized. Please refresh the page.')
    return
  }

  // Generate job ID
  const jobId = uuidv4()

  // Add job to store
  await addJob({
    jobId,
    originalFilename: file.name,
    targetFormat: '', // Will be set during conversion
    status: 'uploading',
    uploadProgress: 0,
    fileSize: file.size,
    mimeType: file.type,
    createdAt: new Date().toISOString()
  })

  // Start upload
  setIsUploading(true)
  setUploadProgress(0)

  // Use the mutation with manual progress tracking
  uploadMutation.mutate({ file, jobId })

  // Simulate progress for better UX
  const progressInterval = setInterval(() => {
    setUploadProgress((prev) => {
      // Only update if still uploading and less than 95%
      if (isUploading && prev < 95) {
        const newProgress = Math.min(prev + 5, 95)
        updateJobProgress(jobId, newProgress)
        return newProgress
      }
      return prev
    })
  }, 300)

  // Clear interval when component unmounts or upload completes
  return () => clearInterval(progressInterval)
}
```

The upload process:
1. Generates a unique job ID using UUID
2. Records the job in the local store
3. Uses React Query's mutation to upload the file
4. Tracks and displays upload progress
5. Notifies the parent component on completion via `onFileUploaded` callback

### 4. Format Selection

After successful upload, the `FormatSelector` component allows the user to choose a target format:

```jsx
<FormatSelector
  sourceFormat={getFileExtension(selectedFile.name)}
  availableFormats={availableFormats}
  selectedFormat={targetFormat}
  onFormatChange={handleFormatChange}
  disabled={isConverting}
/>
```

The component:
1. Shows only compatible formats based on the source file type
2. Updates the selected format in the parent component state
3. Provides visual feedback about format compatibility

### 5. Conversion Process

When the user clicks "Convert", the conversion process begins:

```typescript
// In ConversionFlow.tsx
const handleStartConversion = useCallback(async () => {
  if (!selectedFile || !targetFormat) {
    toast.error('Please select a file and target format')
    return
  }

  try {
    // Start converting
    setIsConverting(true)
    setCurrentStep('convert')

    const convertResponse = await convertFile(jobId, targetFormat)

    if (!convertResponse.success) {
      throw new Error('Conversion failed: ' + (convertResponse.data.message || 'Unknown error'))
    }

    // Update job status to processing
    await updateJobStatus(jobId, 'processing', {
      taskId: convertResponse.data.task_id
    })

    // Poll for job status
    const pollStatus = async () => {
      // Polling logic...
    }

    // Start polling
    pollStatus()
  } catch (error) {
    handleError('Conversion failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
  }
}, [selectedFile, targetFormat, jobId])
```

The conversion process:
1. Calls the `/convert` API endpoint with job ID and target format
2. Updates the job status in the local store
3. Begins polling for status updates

### 6. Status Polling

To track conversion progress, the application polls the server for status updates:

```typescript
// In ConversionFlow.tsx
const pollStatus = async () => {
  try {
    const statusResponse = await getJobStatus(jobId)

    if (!statusResponse.success) {
      throw new Error('Failed to get job status')
    }

    const status = statusResponse.data.status
    const progress = statusResponse.data.progress || 0

    // Update job status in store
    await updateJobStatus(jobId, status, {
      progress,
      completedAt: statusResponse.data.completed_at
    })

    // Update conversion progress
    setConversionProgress(progress)

    if (status === 'completed') {
      // Conversion completed successfully
      setCurrentStep('download')
      setIsConverting(false)
      
      // Get download token
      await getDownloadUrl()
    } else if (status === 'failed') {
      // Conversion failed
      throw new Error(statusResponse.data.error_message || 'Conversion failed')
    } else {
      // Still processing, continue polling
      setTimeout(pollStatus, 2000)
    }
  } catch (error) {
    handleError('Status check failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    setIsConverting(false)
  }
}
```

The polling process:
1. Calls the `/job_status` API endpoint with the job ID
2. Updates the local job status and progress
3. Continues polling until the job is completed or failed
4. Transitions to the download step when complete

### 7. Download

When conversion is complete, the application gets a secure download token:

```typescript
// In ConversionFlow.tsx
const getDownloadUrl = async () => {
  try {
    const tokenResponse = await getDownloadToken(jobId)

    if (!tokenResponse.success) {
      throw new Error('Failed to get download token')
    }

    const token = tokenResponse.data.download_token
    
    // Store token in job data
    await setJobDownloadToken(jobId, token)
    
    // Generate download URL
    const downloadUrl = `${import.meta.env.PUBLIC_API_URL || '/api'}/download?token=${token}`
    setDownloadUrl(downloadUrl)
  } catch (error) {
    handleError('Download preparation failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
  }
}
```

The download process:
1. Calls the `/download_token` API endpoint to get a short-lived token
2. Stores the token with the job
3. Generates a download URL with the token
4. Presents a download button to the user

```jsx
<Button
  variant="primary"
  size="lg"
  onClick={handleDownload}
  disabled={!downloadUrl}
>
  Download Converted File
</Button>
```

When clicked, the download button:
1. Initiates the download using the secure URL
2. Tracks the download in analytics (if enabled)
3. Offers options to start a new conversion

## Error Handling

Error handling is implemented at multiple levels:

### 1. Component-Level Error Handling

Each component handles its own errors and provides user feedback:

```typescript
// Example from ConversionFlow.tsx
const handleError = useCallback((message: string) => {
  setError(message)
  setIsUploading(false)
  setIsConverting(false)
  setUploadProgress(0)
  setConversionProgress(0)
  
  toast.error(message)
}, [])
```

### 2. API-Level Error Handling

The API client provides centralized error handling:

```typescript
// In apiClient.ts
async function processApiResponse<T>(
  response: Response,
  endpoint: string
): Promise<ApiResponse<T>> {
  // Handle HTTP errors
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new SessionError({
        message: `Authentication error: ${response.status} ${response.statusText}`,
        userMessage: 'Your session has expired. Please refresh the page.',
        context: { endpoint, statusCode: response.status }
      })
    }
    
    // More error handling...
  }
  
  // Parse JSON response
  try {
    const data: ApiResponse<T> = await response.json()
    
    // Handle API-level errors
    if (!data.success) {
      // Error handling logic...
    }
    
    return data
  } catch (error) {
    // Handle parsing errors...
  }
}
```

### 3. Global Error Handling

Global error handlers catch unhandled exceptions:

```typescript
// In globalErrorHandler.ts
export function initGlobalErrorHandlers(): void {
  window.addEventListener('error', (event) => {
    // Handle uncaught errors
  })
  
  window.addEventListener('unhandledrejection', (event) => {
    // Handle unhandled promise rejections
  })
}
```

## Job Persistence

To prevent data loss on page refresh, jobs are persisted in IndexedDB:

```typescript
// In upload.ts
export async function initIndexedDB(): Promise<void> {
  try {
    jobsDb = await openDB<JobsDB>('trustyconvert-jobs', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('jobs')) {
          db.createObjectStore('jobs', { keyPath: 'jobId' })
        }
      }
    })
    
    // Load jobs from IndexedDB
    const jobs = await jobsDb.getAll('jobs')
    jobsStore.set(jobs)
  } catch (error) {
    console.error('Failed to initialize IndexedDB:', error)
  }
}
```

This allows the application to:
1. Restore job state after page refresh
2. Continue polling for job status
3. Provide access to previously converted files

## Performance Considerations

The file conversion workflow includes several performance optimizations:

1. **Chunked Uploads** - Large files are uploaded in chunks to prevent timeouts
2. **Progressive Enhancement** - Core functionality works without JavaScript
3. **Optimistic UI Updates** - UI updates before server confirmation for better UX
4. **Background Processing** - Conversion happens in the background
5. **Lazy Loading** - Components are loaded only when needed

## Security Considerations

Security is a priority throughout the conversion workflow:

1. **CSRF Protection** - All API requests include CSRF tokens
2. **File Validation** - Files are validated client-side and server-side
3. **Resource Isolation** - Each job has isolated storage
4. **Short-lived Tokens** - Download tokens expire after 10 minutes
5. **Secure Cookies** - Session cookies use HttpOnly, Secure, and SameSite flags

## Conclusion

The TrustyConvert file conversion workflow provides a secure, user-friendly experience for converting files. By breaking the process into discrete steps and handling errors gracefully, it ensures a smooth experience even when problems occur.

Future enhancements could include:
1. Batch file processing
2. Resumable uploads for very large files
3. Conversion presets for common scenarios
4. Enhanced progress reporting with detailed steps 
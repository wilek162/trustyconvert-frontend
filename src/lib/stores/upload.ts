// Update upload store to use RetryService

/**
 * Upload Store
 * 
 * Manages file upload state with progress tracking and error handling.
 */

import { map } from 'nanostores'
import { createDerivedStore, batchUpdate } from './storeUtils'
import { conversionStore, startConversion } from './conversion'
import { toastService } from '@/lib/services/toastService'
import { debugLog, debugError } from '@/lib/utils/debug'
import { ValidationError, NetworkError, ServerError } from '@/lib/errors/error-types'
import { MESSAGE_TEMPLATES } from '@/lib/constants/messages'
import client from '@/lib/api/client'

export type UploadStatus = 'idle' | 'validating' | 'uploading' | 'completed' | 'failed'

export interface UploadError {
  type: 'validation' | 'network' | 'server' | 'unknown'
  message: string
  details?: unknown
}

export interface UploadState {
  status: UploadStatus
  file: File | null
  progress: number
  error?: UploadError
  startTime?: string
  endTime?: string
  jobId?: string
  retryCount: number
  lastAttempt?: string
  isRetryable: boolean
}

// Initial state
const initialState: UploadState = {
  status: 'idle',
  file: null,
  progress: 0,
  retryCount: 0,
  isRetryable: true
}

// Create the store
export const uploadStore = map<UploadState>(initialState)

// Derived states with memoization
export const isUploading = createDerivedStore(
  uploadStore,
  (state) => state.status === 'uploading' || state.status === 'validating'
)

export const hasUploadError = createDerivedStore(
  uploadStore,
  (state) => state.status === 'failed'
)

export const isUploadComplete = createDerivedStore(
  uploadStore,
  (state) => state.status === 'completed'
)

export const canRetry = createDerivedStore(
  uploadStore,
  (state) => state.status === 'failed' && state.retryCount < 3 && state.isRetryable
)

/**
 * Helper to create upload error object
 */
function createUploadError(error: unknown): UploadError {
  if (error instanceof ValidationError) {
    return {
      type: 'validation',
      message: error.message,
      details: error
    }
  }
  if (error instanceof NetworkError) {
    return {
      type: 'network',
      message: error.message,
      details: error
    }
  }
  if (error instanceof ServerError) {
    return {
      type: 'server',
      message: error.message,
      details: error
    }
  }
  return {
    type: 'unknown',
    message: error instanceof Error ? error.message : 'Unknown upload error',
    details: error
  }
}

/**
 * Start file upload process
 */
export async function startUpload(file: File): Promise<void> {
  try {
    // Update store to validating state first
    batchUpdate(uploadStore, {
      status: 'validating',
      file,
      progress: 0,
      startTime: new Date().toISOString(),
      error: undefined,
      lastAttempt: new Date().toISOString(),
      isRetryable: true
    })

    // Validate file size and type
    if (!file || file.size === 0) {
      throw new ValidationError('Invalid file: File is empty')
    }

    // Update to uploading state
    batchUpdate(uploadStore, {
      status: 'uploading',
      progress: 0
    })

    // Show upload started toast
    toastService.info(MESSAGE_TEMPLATES.upload.started)

    // Generate a job ID for this upload
    const jobId = crypto.randomUUID()

    // Start the upload
    const response = await client.uploadFile(file, jobId)

    if (!response.success) {
      throw new ServerError(response.data?.error || 'Upload failed')
    }

    // Update store with success
    batchUpdate(uploadStore, {
      status: 'completed',
      progress: 100,
      endTime: new Date().toISOString(),
      jobId,
      error: undefined
    })

    // Show success toast
    toastService.success(MESSAGE_TEMPLATES.upload.complete)

    // Start conversion process in conversion store
    startConversion(jobId, file.name, '', file.size)

  } catch (error) {
    debugError('Upload error:', error)
    
    const currentState = uploadStore.get()
    const uploadError = createUploadError(error)
    const isRetryable = uploadError.type !== 'validation'
    
    // Update store with error
    batchUpdate(uploadStore, {
      status: 'failed',
      progress: 0,
      error: uploadError,
      endTime: new Date().toISOString(),
      retryCount: currentState.retryCount + 1,
      isRetryable
    })

    // Show error toast with retry info if available
    const canRetryUpload = isRetryable && currentState.retryCount < 3
    toastService.error(
      canRetryUpload 
        ? `${uploadError.message} Click to retry.`
        : uploadError.message
    )

    throw error
  }
}

/**
 * Update upload progress with validation
 */
export function updateUploadProgress(progress: number): void {
  const currentState = uploadStore.get()
  
  if (currentState.status === 'uploading') {
    const validProgress = Math.min(100, Math.max(0, progress))
    uploadStore.setKey('progress', validProgress)
    
    // Optional: Update toast message for significant progress milestones
    if (validProgress === 50) {
      toastService.info(MESSAGE_TEMPLATES.upload.inProgress)
    }
  }
}

/**
 * Set validation error with proper state update
 */
export function setValidationError(error: string): void {
  const currentState = uploadStore.get()
  
  batchUpdate(uploadStore, {
    status: 'failed',
    error: {
      type: 'validation',
      message: error,
      details: null
    },
    endTime: new Date().toISOString(),
    retryCount: currentState.retryCount + 1
  })
}

/**
 * Retry failed upload
 */
export async function retryUpload(): Promise<void> {
  const currentState = uploadStore.get()
  
  if (currentState.status === 'failed' && currentState.file && currentState.retryCount < 3) {
    await startUpload(currentState.file)
  }
}

/**
 * Reset upload state
 */
export function resetUpload(): void {
  uploadStore.set(initialState)
}

// Export upload service object
export const uploadService = {
  startUpload,
  updateUploadProgress,
  setValidationError,
  retryUpload,
  resetUpload,
  getState: () => uploadStore.get()
}

export default uploadService

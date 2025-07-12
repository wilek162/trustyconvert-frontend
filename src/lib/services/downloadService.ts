/**
 * Download Service
 *
 * Handles file download operations and token management.
 * Implements the approach described in download_guide.md.
 */

import client from '@/lib/api/client'
import { uploadStore } from '@/lib/stores/upload'
import { toastService } from '@/lib/services/toastService'
import { errorHandlingService } from '@/lib/errors/errorHandlingService'
import { debugLog, debugError } from '@/lib/utils/debug'
import { withRetry, RETRY_STRATEGIES } from '@/lib/utils/RetryService'
import type { RetryConfig } from '@/lib/utils/RetryService'
import sessionManager from '@/lib/services/sessionManager'
import { MESSAGE_TEMPLATES } from '@/lib/constants/messages'
import { DownloadError } from '@/lib/errors/error-types'

export interface DownloadOptions {
  onProgress?: (progress: number) => void
  onError?: (error: Error) => void
  onComplete?: () => void
  signal?: AbortSignal
  retryConfig?: Partial<RetryConfig>
}

export interface DownloadResult {
  success: boolean
  token?: string
  url?: string
  error?: string
}

/**
 * Download service for handling file downloads
 */
class DownloadService {
  private static instance: DownloadService
  
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  public static getInstance(): DownloadService {
    if (!DownloadService.instance) {
      DownloadService.instance = new DownloadService()
    }
    return DownloadService.instance
  }

  /**
   * Get a download token for a job
   * @param jobId The job ID to get a download token for
   * @returns Download result with token and URL
   */
  public async getDownloadToken(jobId: string): Promise<DownloadResult> {
    try {
      debugLog('Requesting download token for job', { jobId })
      
      // Ensure session is valid before proceeding
      await sessionManager.ensureSession()
      
      // Use retry service for token retrieval
      const response = await withRetry(
        async () => client.getDownloadToken(jobId),
        {
          ...RETRY_STRATEGIES.DOWNLOAD,
          endpoint: `download/token/${jobId}`,
          context: { action: 'getDownloadToken', jobId }
        }
      )
      
      const downloadToken = response.data.download_token
      
      if (!downloadToken) {
        const error = new DownloadError(
          'Failed to get download token from response',
          { jobId, response }
        )
        throw error
      }
      
      debugLog('Successfully extracted download token', { jobId })
      
      // Generate the download URL
      const downloadUrl = client.getDownloadUrl(downloadToken)
      
      return {
        success: true,
        token: downloadToken,
        url: downloadUrl
      }
    } catch (error) {
      debugError('Failed to get download token', error)
      const result = await errorHandlingService.handleError(error, {
        context: { action: 'getDownloadToken', jobId },
        showToast: false, // Let the component handle toasts
        endpoint: `download/token/${jobId}`
      })
      
      return {
        success: false,
        error: result.message
      }
    }
  }
  
  /**
   * Download a file using the token-based approach
   * @param jobId The job ID to download
   * @param options Download options including callbacks
   * @returns Download result
   */
  public async downloadFile(jobId: string, options: DownloadOptions = {}): Promise<DownloadResult> {
    const { onProgress, onError, onComplete, signal, retryConfig } = options
    
    try {
      debugLog('Starting download process for job', { jobId })
      
      // Show loading toast
      const toastId = toastService.loading(MESSAGE_TEMPLATES.download.started)
      
      // Ensure session is valid before proceeding
      await sessionManager.ensureSession()
      
      // Step 1: Get download token with retry
      const tokenResult = await withRetry(
        async () => this.getDownloadToken(jobId),
        {
          ...RETRY_STRATEGIES.DOWNLOAD,
          ...retryConfig,
          endpoint: `download/file/${jobId}`,
          context: { action: 'downloadFile', jobId }
        }
      )
      
      if (!tokenResult.success || !tokenResult.token || !tokenResult.url) {
        const error = new DownloadError(
          tokenResult.error || 'Failed to get download token',
          { jobId, tokenResult }
        )
        throw error
      }
      
      // Step 2: Use the recommended approach - browser redirection
      try {
        const a = document.createElement('a')
        a.href = tokenResult.url
        a.download = '' // Let the server set the filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        
        debugLog('Download initiated via browser redirection', { url: tokenResult.url })
        
        // Update toast
        toastService.update(toastId, MESSAGE_TEMPLATES.download.complete, 'success')
        
        // Notify completion
        if (onComplete) onComplete()
        
        return {
          success: true,
          token: tokenResult.token,
          url: tokenResult.url
        }
      } catch (error) {
        // Handle browser-specific download errors
        const downloadError = new DownloadError(
          'Failed to initiate download in browser',
          { jobId, url: tokenResult.url, originalError: error }
        )
        throw downloadError
      }
    } catch (error) {
      debugError('Download failed', error)
      const result = await errorHandlingService.handleError(error, {
        context: { action: 'downloadFile', jobId },
        showToast: true,
        endpoint: `download/file/${jobId}`,
        severity: 'error'
      })
      
      if (onError) onError(new Error(result.message))
      
      return {
        success: false,
        error: result.message
      }
    }
  }
}

// Export singleton instance
export const downloadService = DownloadService.getInstance()


// Export as default for backward compatibility
export default downloadService

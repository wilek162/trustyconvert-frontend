import { toastService } from './toastService'
import { errorHandlingService } from '@/lib/errors/errorHandlingService'
import { retryService, RETRY_STRATEGIES } from '@/lib/utils/RetryService'
import { MESSAGE_TEMPLATES } from '@/lib/constants/messages'
import {
  conversionStore,
  startConversion,
  completeConversion,
  setConversionError,
  resetConversion
} from '@/lib/stores/conversion'
import client from '@/lib/api/client'
import { downloadService } from './downloadService'
import { getFileExtension } from '@/lib/utils/files'
import { debugLog, debugError } from '@/lib/utils/debug'
import { ConversionError } from '@/lib/errors/error-types'

/**
 * Centralized service for managing file conversions
 * Provides methods for the complete conversion lifecycle
 */
export class ConversionService {
  /**
   * Handle file upload with retry and error handling
   * @param file File to upload
   * @param jobId Job ID for tracking
   * @returns Upload response
   */
  static async uploadFile(file: File, jobId: string) {
    toastService.info(MESSAGE_TEMPLATES.upload.started)
    
    try {
      const response = await retryService.withRetry(
        () => client.uploadFile(file, jobId),
        {
          ...RETRY_STRATEGIES.CRITICAL,
          onRetry: (error: unknown) => {
            toastService.info('Retrying upload...')
          },
          context: {
            action: 'uploadFile',
            fileName: file.name,
            fileSize: file.size,
            jobId
          }
        }
      )

      if (!response || !response.success) {
        throw new Error(response?.data?.message || MESSAGE_TEMPLATES.upload.failed)
      }

      toastService.success(MESSAGE_TEMPLATES.upload.complete)
      return response
    } catch (error) {
      await errorHandlingService.handleError(error, {
        context: {
          action: 'uploadFile',
          fileName: file.name,
          fileSize: file.size,
          jobId
        },
        showToast: true
      })
      throw error
    }
  }

  /**
   * Handle file conversion with retry and error handling
   * @param jobId Job ID of the uploaded file
   * @param targetFormat Target format for conversion
   * @param sourceFormat Source format of the file
   * @returns Conversion response
   */
  static async convertFile(jobId: string, targetFormat: string, sourceFormat: string) {
    toastService.info(MESSAGE_TEMPLATES.conversion.started)

    try {
      const response = await retryService.withRetry(
        () => client.convertFile(jobId, targetFormat, sourceFormat),
        {
          ...RETRY_STRATEGIES.CRITICAL,
          onRetry: (error: unknown) => {
            toastService.info('Retrying conversion...')
          },
          context: {
            action: 'convertFile',
            jobId,
            targetFormat,
            sourceFormat
          }
        }
      )

      if (!response || !response.success) {
        throw new ConversionError(
          response?.data?.message || MESSAGE_TEMPLATES.conversion.failed,
          jobId,
          'failed'
        )
      }

      return response
    } catch (error) {
      await errorHandlingService.handleError(error, {
        context: {
          action: 'convertFile',
          jobId,
          targetFormat,
          sourceFormat
        },
        showToast: true
      })
      throw error
    }
  }

  /**
   * Start the complete conversion process
   * @param file File to convert
   * @param targetFormat Target format for conversion
   * @returns Job ID and success status
   */
  static async startConversionProcess(file: File, targetFormat: string) {
    const jobId = crypto.randomUUID()
    const sourceFormat = getFileExtension(file.name)

    debugLog('Starting conversion process', { 
      fileName: file.name, 
      fileSize: file.size,
      sourceFormat,
      targetFormat,
      jobId
    })

    try {
      // Upload file
      const uploadResponse = await this.uploadFile(file, jobId)
      const responseJobId = uploadResponse.data.jobId || uploadResponse.data.job_id || jobId

      // Convert file
      const convertResponse = await this.convertFile(responseJobId, targetFormat, sourceFormat)
      const conversionJobId = convertResponse.data.job_id || responseJobId

      // Initialize conversion in store
      startConversion(conversionJobId, file.name, targetFormat, file.size)

      return {
        jobId: conversionJobId,
        success: true
      }
    } catch (error) {
      debugError('Conversion process failed', error)
      setConversionError(error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  /**
   * Handle conversion completion
   * @param jobId Job ID of the completed conversion
   * @returns Download result with URL and token
   */
  static async handleConversionComplete(jobId: string) {
    try {
      const downloadResult = await downloadService.getDownloadToken(jobId)

      if (!downloadResult.success) {
        throw new ConversionError(
          downloadResult.error || 'Failed to get download token',
          jobId,
          'failed'
        )
      }

      completeConversion(downloadResult.url || '', downloadResult.token || '')
      toastService.success(MESSAGE_TEMPLATES.conversion.complete)

      return downloadResult
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setConversionError(errorMessage)
      
      await errorHandlingService.handleError(error, {
        context: {
          action: 'handleConversionComplete',
          jobId
        },
        showToast: true
      })
      
      throw error
    }
  }

  /**
   * Reset conversion state
   */
  static resetConversionState() {
    resetConversion()
  }
} 
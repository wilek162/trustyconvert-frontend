/**
 * Enhanced Error Handling Service
 *
 * A centralized service for handling errors with recovery strategies and user-friendly messages.
 * This service integrates with the monitoring system and toast notifications.
 */

import { reportError } from '@/lib/monitoring/init'
import { showToast } from '@/components/providers/ToastListener'
import { MESSAGE_TEMPLATES } from '@/lib/utils/messageUtils'
import {
  ApiError,
  ConversionError,
  NetworkError,
  SessionError,
  ValidationError
} from './error-types'
import { debugLog, debugError } from '@/lib/utils/debug'
import sessionManager from '@/lib/services/sessionManager'
import { isRetryableError, RETRY_STRATEGIES } from '@/lib/utils/retry'

// Error context interface
export interface ErrorContext {
  component?: string
  action?: string
  recoverable?: boolean
  retryCount?: number
  maxRetries?: number
  retryStrategy?: keyof typeof RETRY_STRATEGIES
  [key: string]: any
}

// Error recovery strategy type
export type RecoveryStrategy = (error: Error, context: ErrorContext) => Promise<boolean>

/**
 * Error handling service
 */
class ErrorHandlingService {
  private static instance: ErrorHandlingService
  private readonly isDevelopment = import.meta.env.DEV
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map()

  private constructor() {
    // Register default recovery strategies
    this.registerRecoveryStrategy('SessionError', this.recoverSessionError)
    this.registerRecoveryStrategy('NetworkError', this.recoverNetworkError)
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ErrorHandlingService {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService()
    }
    return ErrorHandlingService.instance
  }

  /**
   * Register a recovery strategy for a specific error type
   */
  public registerRecoveryStrategy(errorType: string, strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(errorType, strategy)
  }

  /**
   * Handle an error with potential recovery
   */
  public async handleError(
    error: unknown,
    options: {
      context?: ErrorContext
      showToast?: boolean
      rethrow?: boolean
      severity?: 'error' | 'warning' | 'info'
      retryAction?: () => Promise<any>
    } = {}
  ): Promise<{
    recovered: boolean
    message: string
    retryResult?: any
  }> {
    const context = options.context || {}
    const errorObj = this.normalizeError(error)
    const errorType = errorObj.name
    
    // Log the error
    this.logError(errorObj, context)

    // Check if the error is retryable
    const isRetryable = this.isErrorRetryable(errorObj, context)
    
    // Determine retry limits based on strategy or defaults
    const retryStrategy = context.retryStrategy || 'API_REQUEST'
    const maxRetries = context.maxRetries || RETRY_STRATEGIES[retryStrategy].maxRetries
    const retryCount = context.retryCount || 0
    
    // Don't attempt recovery if max retries reached
    if (retryCount >= maxRetries) {
      debugLog(`Recovery aborted: max retries (${maxRetries}) reached`)
      
      // Call the onExhausted handler if provided
      if (options.retryAction && context.onExhausted) {
        try {
          await context.onExhausted(errorObj, retryCount)
        } catch (e) {
          debugError('Error in onExhausted handler:', e)
        }
      }
      
      return {
        recovered: false,
        message: this.formatErrorForUser(errorObj)
      }
    }

    // Try to recover from the error
    let recovered = false
    let retryResult
    
    if (context.recoverable !== false && isRetryable) {
      const recoveryStrategy = this.recoveryStrategies.get(errorType)
      
      if (recoveryStrategy) {
        try {
          debugLog(`Attempting to recover from ${errorType} (attempt ${retryCount + 1}/${maxRetries})`)
          recovered = await recoveryStrategy.call(this, errorObj, {
            ...context,
            retryCount,
            maxRetries
          })
          
          // If recovery was successful and we have a retry action, execute it
          if (recovered && options.retryAction) {
            try {
              retryResult = await options.retryAction()
            } catch (retryError) {
              debugError('Retry action failed after successful recovery:', retryError)
              recovered = false
            }
          }
        } catch (recoveryError) {
          debugError('Error during recovery attempt:', recoveryError)
        }
      }
    }

    // Format user-friendly message
    const userMessage = this.formatErrorForUser(errorObj)
    
    // Show toast if requested
    if (options.showToast) {
      const severity = options.severity || (recovered ? 'info' : 'error')
      const message = recovered 
        ? 'Issue automatically resolved. Please continue.' 
        : userMessage
      
      showToast(
        message,
        severity,
        severity === 'error' ? 10000 : 5000
      )
    }

    // Rethrow if requested and not recovered
    if (options.rethrow && !recovered) {
      throw errorObj
    }

    return {
      recovered,
      message: userMessage,
      retryResult
    }
  }

  /**
   * Determine if an error is retryable based on type and context
   */
  private isErrorRetryable(error: Error, context: ErrorContext): boolean {
    // If explicitly marked as not recoverable, don't retry
    if (context.recoverable === false) {
      return false
    }
    
    // Check if we've reached max retries
    const retryCount = context.retryCount || 0
    const maxRetries = context.maxRetries || 
      RETRY_STRATEGIES[context.retryStrategy as keyof typeof RETRY_STRATEGIES || 'API_REQUEST'].maxRetries
    
    if (retryCount >= maxRetries) {
      return false
    }
    
    // Use the utility function from retry.ts to determine if error is retryable
    return isRetryableError(error)
  }

  /**
   * Format an error for user display
   */
  public formatErrorForUser(error: Error): string {
    if (error instanceof ApiError) {
      if (error.statusCode === 401 || error.statusCode === 403) {
        return MESSAGE_TEMPLATES.session.invalid
      }
      if (error.statusCode === 404) {
        return 'The requested resource was not found.'
      }
      if (error.statusCode >= 500) {
        return MESSAGE_TEMPLATES.generic.serverError
      }
      return error.message || MESSAGE_TEMPLATES.generic.serverError
    }

    if (error instanceof NetworkError) {
      return MESSAGE_TEMPLATES.generic.networkError
    }

    if (error instanceof ValidationError) {
      return error.message || 'Validation error'
    }

    if (error instanceof ConversionError) {
      return error.message || MESSAGE_TEMPLATES.conversion.failed
    }

    if (error instanceof SessionError) {
      return error.message || MESSAGE_TEMPLATES.session.invalid
    }

    return error.message || MESSAGE_TEMPLATES.generic.error
  }

  /**
   * Log an error with context
   */
  private logError(error: Error, context: ErrorContext = {}): void {
    // In development, log to console with detailed info
    if (this.isDevelopment) {
      console.group('Application Error')
      console.error(error)

      if (context) {
        console.log('Error Context:', context)
      }

      console.groupEnd()
    }

    // In production, send to monitoring service
    reportError(error, context)
  }

  /**
   * Normalize an unknown error into an Error object
   */
  private normalizeError(error: unknown): Error {
    if (error instanceof Error) {
      return error
    }
    
    return new Error(typeof error === 'string' ? error : 'Unknown error')
  }

  /**
   * Recovery strategy for session errors
   */
  private async recoverSessionError(error: Error, context: ErrorContext): Promise<boolean> {
    if (!(error instanceof SessionError)) return false
    
    try {
      debugLog('Attempting to recover from session error by reinitializing session')
      
      // Try to reinitialize the session
      const success = await sessionManager.initSession(true)
      
      if (success) {
        debugLog('Session recovery successful')
        return true
      }
      
      debugError('Session recovery failed')
      return false
    } catch (recoveryError) {
      debugError('Error during session recovery:', recoveryError)
      return false
    }
  }

  /**
   * Recovery strategy for network errors
   */
  private async recoverNetworkError(error: Error, context: ErrorContext): Promise<boolean> {
    if (!(error instanceof NetworkError)) return false
    
    // Get retry count from context or default to 0
    const retryCount = context.retryCount || 0
    const retryStrategy = context.retryStrategy || 'API_REQUEST'
    const maxRetries = context.maxRetries || RETRY_STRATEGIES[retryStrategy].maxRetries
    
    // Don't retry if we've reached the max retries
    if (retryCount >= maxRetries) {
      debugLog(`Network recovery aborted: max retries (${maxRetries}) reached`)
      return false
    }
    
    try {
      // Get backoff configuration from the retry strategy
      const strategyConfig = RETRY_STRATEGIES[retryStrategy]
      
      // Implement exponential backoff
      const backoffTime = Math.pow(strategyConfig.backoffFactor, retryCount) * strategyConfig.initialDelay
      const cappedBackoff = Math.min(backoffTime, strategyConfig.maxDelay)
      
      debugLog(`Network recovery: waiting ${cappedBackoff}ms before retry ${retryCount + 1}/${maxRetries}`)
      
      // Wait for backoff time
      await new Promise(resolve => setTimeout(resolve, cappedBackoff))
      
      // We don't actually retry here - we just prepare for the retry
      // The actual retry will be done by the caller if we return true
      
      // Update retry count in context
      context.retryCount = retryCount + 1
      
      return true
    } catch (recoveryError) {
      debugError('Error during network recovery:', recoveryError)
      return false
    }
  }

  /**
   * Wrap a function with error handling
   */
  public withErrorHandling<T extends (...args: any[]) => any>(
    fn: T,
    options: {
      context?: ErrorContext
      showToast?: boolean
      rethrow?: boolean
      severity?: 'error' | 'warning' | 'info'
    } = {}
  ): (...args: Parameters<T>) => Promise<ReturnType<T> | undefined> {
    return async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
      try {
        const result = fn(...args)

        // Handle promise results
        if (result instanceof Promise) {
          try {
            return await result
          } catch (error) {
            const { recovered, retryResult } = await this.handleError(error, {
              ...options,
              retryAction: () => fn(...args)
            })
            
            if (recovered && retryResult !== undefined) {
              return retryResult as ReturnType<T>
            }
            
            return undefined
          }
        }

        return result
      } catch (error) {
        await this.handleError(error, options)
        return undefined
      }
    }
  }
}

// Export singleton instance
export const errorHandlingService = ErrorHandlingService.getInstance()

// Export a convenience function for handling errors
export async function handleError(
  error: unknown,
  options: {
    context?: ErrorContext
    showToast?: boolean
    rethrow?: boolean
    severity?: 'error' | 'warning' | 'info'
    retryAction?: () => Promise<any>
  } = {}
): Promise<{
  recovered: boolean
  message: string
  retryResult?: any
}> {
  return errorHandlingService.handleError(error, options)
}

// Export a convenience function for wrapping functions with error handling
export function withErrorHandling<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    context?: ErrorContext
    showToast?: boolean
    rethrow?: boolean
    severity?: 'error' | 'warning' | 'info'
  } = {}
): (...args: Parameters<T>) => Promise<ReturnType<T> | undefined> {
  return errorHandlingService.withErrorHandling(fn, options)
}
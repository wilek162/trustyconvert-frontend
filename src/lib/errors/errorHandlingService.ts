// Replace useErrorHandler with errorHandlingService
// Remove duplicate implementations in useErrorHandler.ts
// Update ErrorBoundary.tsx to use single errorHandlingService

/**
 * Enhanced Error Handling Service
 *
 * A centralized service for handling errors with sophisticated recovery strategies
 * and user-friendly messages. This service integrates with the monitoring system,
 * toast notifications, and provides consistent error handling across the application.
 */

import { reportError } from '@/lib/monitoring/init'
import { debugLog, debugError } from '@/lib/utils/debug'
import { toastService } from '@/lib/services/toastService'
import { MESSAGE_TEMPLATES } from '@/lib/constants/messages'
import {
  ApiError,
  ConversionError,
  NetworkError,
  SessionError,
  ValidationError,
  RetryableError,
  ClientError,
  DownloadError,
  UploadError,
  StorageError,
  FormatError
} from './error-types'

// Error context interface
export interface ErrorContext {
  component?: string
  action?: string
  recoverable?: boolean
  retryCount?: number
  maxRetries?: number
  shouldShowToast?: boolean
  metadata?: Record<string, any>
  [key: string]: any
}

// Error recovery strategy type
export type RecoveryStrategy = (error: Error, context: ErrorContext) => Promise<boolean>

// Error handling result
export interface ErrorHandlingResult {
  recovered: boolean
  message: string
  errorCode?: string
  retryable: boolean
  context?: ErrorContext
  originalError?: Error
}

// Singleton error handling service
class ErrorHandlingService {
  private static instance: ErrorHandlingService
  private readonly isDevelopment = import.meta.env.DEV
  private recoveryStrategies: Map<string, RecoveryStrategy> = new Map()
  private errorClassifications: Map<string, { retryable: boolean, userMessage: string }> = new Map()
  
  // Circuit breaker state
  private failedEndpoints: Map<string, { 
    failCount: number,
    lastFailTime: number,
    cooldownUntil?: number
  }> = new Map()
  
  private constructor() {
    this.initializeErrorClassifications()
    this.initializeRecoveryStrategies()
  }

  /**
   * Initialize error classifications for consistent handling
   */
  private initializeErrorClassifications(): void {
    // Network errors
    this.classifyError('NetworkError', { 
      retryable: true, 
      userMessage: MESSAGE_TEMPLATES.generic.networkError
    })
    
    // Session errors
    this.classifyError('SessionError', { 
      retryable: true, 
      userMessage: MESSAGE_TEMPLATES.session.invalid
    })
    
    // API errors by status code
    this.classifyError('ApiError:401', { 
      retryable: false, 
      userMessage: MESSAGE_TEMPLATES.session.invalid
    })
    this.classifyError('ApiError:403', { 
      retryable: false, 
      userMessage: MESSAGE_TEMPLATES.session.invalid
    })
    this.classifyError('ApiError:404', { 
      retryable: false, 
      userMessage: 'The requested resource was not found'
    })
    this.classifyError('ApiError:429', { 
      retryable: true, 
      userMessage: 'The service is currently experiencing high load. Please try again shortly.'
    })
    this.classifyError('ApiError:5xx', { 
      retryable: true, 
      userMessage: MESSAGE_TEMPLATES.generic.serverError
    })
    
    // Conversion errors
    this.classifyError('ConversionError', { 
      retryable: false, 
      userMessage: MESSAGE_TEMPLATES.conversion.failed
    })
    
    // Validation errors
    this.classifyError('ValidationError', { 
      retryable: false, 
      userMessage: 'Please check your input and try again'
    })

    // Download errors
    this.classifyError('DownloadError', {
      retryable: true,
      userMessage: MESSAGE_TEMPLATES.download.failed
    })

    // Upload errors
    this.classifyError('UploadError', {
      retryable: true,
      userMessage: MESSAGE_TEMPLATES.upload.failed
    })

    // Storage errors
    this.classifyError('StorageError', {
      retryable: true,
      userMessage: 'There was a problem with file storage. Please try again.'
    })

    // Format errors
    this.classifyError('FormatError', {
      retryable: false,
      userMessage: 'The selected file format is not supported.'
    })

    // Client errors
    this.classifyError('ClientError', {
      retryable: false,
      userMessage: MESSAGE_TEMPLATES.generic.clientError
    })
  }

  /**
   * Register default recovery strategies
   */
  private initializeRecoveryStrategies(): void {
    // Session recovery strategy
    this.registerRecoveryStrategy('SessionError', async (error, context) => {
      try {
        const sessionManager = (await import('@/lib/services/sessionManager')).default
        await sessionManager.initSession(true)
        return true
      } catch {
        return false
      }
    })

    // Network recovery strategy
    this.registerRecoveryStrategy('NetworkError', async (error, context) => {
      // Wait briefly before retrying network operations
      await new Promise(resolve => setTimeout(resolve, 1000))
      return true
    })

    // Rate limit recovery strategy
    this.registerRecoveryStrategy('ApiError:429', async (error, context) => {
      const retryAfter = parseInt(context.retryAfter || '5000')
      await new Promise(resolve => setTimeout(resolve, retryAfter))
      return true
    })

    // Download recovery strategy
    this.registerRecoveryStrategy('DownloadError', async (error, context) => {
      if (context.retryCount && context.retryCount > 2) return false
      await new Promise(resolve => setTimeout(resolve, 1000))
      return true
    })

    // Upload recovery strategy
    this.registerRecoveryStrategy('UploadError', async (error, context) => {
      if (context.retryCount && context.retryCount > 2) return false
      await new Promise(resolve => setTimeout(resolve, 1000))
      return true
    })
  }

  /**
   * Classify an error type with handling information
   */
  public classifyError(errorType: string, classification: { retryable: boolean, userMessage: string }): void {
    this.errorClassifications.set(errorType, classification)
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
   * Handle an error with potential recovery and user feedback
   */
  public async handleError(
    error: unknown,
    options: {
      context?: ErrorContext
      showToast?: boolean
      rethrow?: boolean
      severity?: 'error' | 'warning' | 'info'
      retryAction?: () => Promise<any>
      endpoint?: string
    } = {}
  ): Promise<ErrorHandlingResult> {
    const context = options.context || {}
    const showToast = options.showToast ?? context.shouldShowToast ?? true
    const errorObj = this.normalizeError(error)
    
    // Track the error with the monitoring system
    this.trackError(errorObj, context)
    
    // Log the error for debugging
    this.logError(errorObj, context)
    
    // Check circuit breaker status for the endpoint
    if (options.endpoint && this.isCircuitBroken(options.endpoint)) {
      debugLog(`Circuit breaker open for endpoint: ${options.endpoint}`)
      return {
        recovered: false,
        message: 'The service is temporarily unavailable. Please try again later.',
        retryable: false,
        context,
        originalError: errorObj
      }
    }
    
    // Get error classification
    const errorClassification = this.getErrorClassification(errorObj)
    const isRetryable = errorClassification.retryable
    
    // Try to recover from the error
    let recovered = false
    let retryResult
    
    if (context.recoverable !== false && isRetryable) {
      const recoveryStrategy = this.getRecoveryStrategy(errorObj)
      
      if (recoveryStrategy) {
        try {
          debugLog(`Attempting to recover from ${errorObj.name}`)
          recovered = await recoveryStrategy.call(this, errorObj, context)
          
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

    // Show user feedback if needed
    if (showToast && this.shouldShowUserFeedback(errorObj)) {
      const message = this.formatErrorForUser(errorObj)
      this.showErrorMessage(message, options.severity || 'error')
    }

    // Record failure in circuit breaker if endpoint provided
    if (options.endpoint && !recovered) {
      this.recordFailure(options.endpoint)
    }

    // Prepare result
    const result: ErrorHandlingResult = {
      recovered,
      message: this.formatErrorForUser(errorObj),
      errorCode: errorObj.name,
      retryable: isRetryable,
      context,
      originalError: errorObj
    }

    // Rethrow if requested and not recovered
    if (options.rethrow && !recovered) {
      throw errorObj
    }

    return result
  }
  
  /**
   * Get the appropriate recovery strategy for an error
   */
  private getRecoveryStrategy(error: Error): RecoveryStrategy | undefined {
    // Try to get a specific strategy for this error type
    const strategy = this.recoveryStrategies.get(error.name)
    if (strategy) return strategy
    
    // Check for common error categories
    if (error instanceof NetworkError) {
      return this.recoveryStrategies.get('NetworkError')
    } else if (error instanceof ApiError) {
      // Try to get a strategy for this specific status code
      return this.recoveryStrategies.get(`ApiError:${error.statusCode}`)
    }
    
    // No specific strategy found
    return undefined
  }
  
  /**
   * Get error classification information
   */
  private getErrorClassification(error: Error): { retryable: boolean, userMessage: string } {
    // Check for specific error type match
    let classification = this.errorClassifications.get(error.name)
    
    // If not found, check for more specific types
    if (!classification && error instanceof ApiError) {
      // Try to match by status code
      classification = this.errorClassifications.get(`ApiError:${error.statusCode}`)
      
      // Or by status code range (e.g., 5xx)
      if (!classification && error.statusCode >= 500) {
        classification = this.errorClassifications.get('ApiError:5xx')
      }
    }
    
    // Default classification as fallback
    return classification || { 
      retryable: false, 
      userMessage: MESSAGE_TEMPLATES.generic.error 
    }
  }

  /**
   * Check if circuit breaker is tripped for an endpoint
   */
  private isCircuitBroken(endpoint: string): boolean {
    const state = this.failedEndpoints.get(endpoint)
    
    if (!state) return false
    
    // Check if we're still in cooldown period
    if (state.cooldownUntil && Date.now() < state.cooldownUntil) {
      return true
    }
    
    // If cooldown period has passed, reset the circuit breaker
    if (state.cooldownUntil && Date.now() >= state.cooldownUntil) {
      this.failedEndpoints.delete(endpoint)
      return false
    }
    
    return false
  }
  
  /**
   * Record a failure for circuit breaker logic
   */
  private recordFailure(endpoint: string): void {
    const now = Date.now()
    const state = this.failedEndpoints.get(endpoint) || { failCount: 0, lastFailTime: now }
    
    // If last failure was more than 1 minute ago, reset counter
    if (now - state.lastFailTime > 60000) {
      state.failCount = 1
    } else {
      state.failCount += 1
    }
    
    state.lastFailTime = now
    
    // If we've had multiple failures in a short period, trip the circuit breaker
    if (state.failCount >= 5) {
      // Set a 30-second cooldown period
      state.cooldownUntil = now + 30000
      debugLog(`Circuit breaker tripped for endpoint: ${endpoint}, cooldown until: ${new Date(state.cooldownUntil).toISOString()}`)
    }
    
    this.failedEndpoints.set(endpoint, state)
  }

  /**
   * Track error with monitoring system
   */
  private trackError(error: Error, context: ErrorContext = {}): void {
    // Report to error monitoring service
    reportError(error, context)
  }

  /**
   * Format an error for user display
   */
  private formatErrorForUser(error: Error): string {
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

    if (error instanceof DownloadError) {
      return error.message || MESSAGE_TEMPLATES.download.failed
    }

    if (error instanceof UploadError) {
      return error.message || MESSAGE_TEMPLATES.upload.failed
    }

    if (error instanceof StorageError) {
      return error.message || 'There was a problem with file storage. Please try again.'
    }

    if (error instanceof FormatError) {
      return error.message || 'The selected file format is not supported.'
    }

    if (error instanceof ClientError) {
      return error.message || MESSAGE_TEMPLATES.generic.clientError
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
  }

  /**
   * Show error message to user
   */
  private showErrorMessage(message: string, severity: 'error' | 'warning' | 'info' = 'error'): void {
    toastService.show(message, severity)
  }

  /**
   * Normalize an unknown error into an Error object
   */
  private normalizeError(error: unknown): Error {
    if (error instanceof Error) {
      return error
    }
    
    if (typeof error === 'string') {
      return new Error(error)
    }
    
    return new Error(JSON.stringify(error))
  }

  /**
   * Create a function wrapper with error handling
   */
  public initGlobalHandlers(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      this.handleGlobalError(event.error || new Error(event.message), {
        type: 'uncaught-exception',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      this.handleGlobalError(error, {
        type: 'unhandled-rejection',
      });
    });

    if (this.isDevelopment) {
      console.log('Global error handlers initialized by ErrorHandlingService');
    }
  }

  private handleGlobalError(error: Error, context: Record<string, any>): void {
    this.trackError(error, {
      ...context,
      globalHandler: true,
      url: window.location.href,
    });

    if (!this.isDevelopment && this.shouldShowUserFeedback(error)) {
      this.showErrorMessage(MESSAGE_TEMPLATES.generic.error)
    }
  }

  private shouldShowUserFeedback(error: Error): boolean {
    if (error.name === 'NetworkError' || error.message.includes('network') || error.message.includes('fetch')) {
      return false;
    }
    if (error.message.includes('script') && error.message.includes('load')) {
      return false;
    }
    return true;
  }
}

// Export singleton instance
export const errorHandlingService = ErrorHandlingService.getInstance()

// Export convenience function
export async function handleError(
  error: unknown,
  options: {
    context?: ErrorContext
    showToast?: boolean
    rethrow?: boolean
    severity?: 'error' | 'warning' | 'info'
    retryAction?: () => Promise<any>
    endpoint?: string
  } = {}
): Promise<ErrorHandlingResult> {
  return errorHandlingService.handleError(error, options)
}

// Export wrapped function creator
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    context?: ErrorContext
    showToast?: boolean
    rethrow?: boolean
    severity?: 'error' | 'warning' | 'info'
    endpoint?: string
  } = {}
): (...args: Parameters<T>) => Promise<ReturnType<T> | undefined> {
  return async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
    try {
      return await fn(...args)
    } catch (error) {
      await errorHandlingService.handleError(error, options)
      return undefined
    }
  }
}
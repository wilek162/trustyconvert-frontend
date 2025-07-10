/**
 * Enhanced Error Handling Service
 *
 * A centralized service for handling errors with sophisticated recovery strategies
 * and user-friendly messages. This service integrates with the monitoring system,
 * toast notifications, and provides consistent error handling across the application.
 */

import { reportError } from '@/lib/monitoring/init'
import { toastService } from '@/lib/services/toastService'
import { formatMessage, MESSAGE_TEMPLATES } from '@/lib/utils/messageUtils'
import {
  ApiError,
  ConversionError,
  NetworkError,
  SessionError,
  ValidationError,
  RetryableError,
  ClientError
} from './error-types'
import { debugLog, debugError } from '@/lib/utils/debug'

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
        retryable: false
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

    // Update circuit breaker state for the endpoint if applicable
    if (options.endpoint && !recovered) {
      this.recordFailure(options.endpoint)
    }

    // Format user-friendly message
    const userMessage = errorClassification.userMessage || this.formatErrorForUser(errorObj)
    
    // Show toast if requested
    if (showToast) {
      const severity = options.severity || (recovered ? 'info' : 'error')
      const message = recovered 
        ? 'Issue automatically resolved. Please continue.' 
        : userMessage
      
      toastService.show(
        message,
        severity,
        { duration: severity === 'error' ? 10000 : 5000 }
      )
    }

    // Rethrow if requested and not recovered
    if (options.rethrow && !recovered) {
      throw errorObj
    }

    return {
      recovered,
      message: userMessage,
      errorCode: errorObj instanceof ApiError ? errorObj.code : errorObj.name,
      retryable: isRetryable
    }
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
  public withErrorHandling<T extends (...args: any[]) => Promise<any>>(
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
        const { recovered, retryable } = await this.handleError(error, options)
        
        if (recovered) {
          // Try once more if we recovered
          return await fn(...args)
        }
        
        return undefined
      }
    }
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
  return errorHandlingService.withErrorHandling(fn, options)
}
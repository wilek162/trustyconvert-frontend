/**
 * Error Handling System Initialization
 *
 * This module initializes the error handling system, including:
 * - Registering recovery strategies
 * - Setting up global error handlers
 * - Configuring error classifications
 */

import { errorHandlingService } from './ErrorHandlingService'
import { registerRecoveryStrategies } from './RecoveryStrategies'
import { debugLog } from '@/lib/utils/debug'
import { reportError } from '@/lib/monitoring/init'

/**
 * Initialize the error handling system
 * Should be called during application startup
 */
export function initErrorHandling(): void {
  // Register recovery strategies
  registerRecoveryStrategies(errorHandlingService)
  
  // Set up global error handlers
  if (typeof window !== 'undefined') {
    initGlobalErrorHandlers()
  }
  
  debugLog('Error handling system initialized')
}

/**
 * Initialize global error handlers for uncaught exceptions and unhandled promise rejections
 */
function initGlobalErrorHandlers(): void {
  // Handle uncaught exceptions
  window.addEventListener('error', (event) => {
    handleGlobalError(event.error || new Error(event.message), {
      type: 'uncaught-exception',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    })

    // Don't prevent default behavior
    return false
  })

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason))

    handleGlobalError(error, {
      type: 'unhandled-rejection',
      promise: event.promise
    })

    // Don't prevent default behavior
    return false
  })

  // Log initialization in development
  if (import.meta.env.DEV) {
    console.log('Global error handlers initialized')
  }
}

/**
 * Handle a global error by reporting it and showing user feedback when appropriate
 */
function handleGlobalError(error: Error, context: Record<string, any>): void {
  // Report error to monitoring service
  reportError(error, {
    ...context,
    globalHandler: true,
    url: window.location.href,
    timestamp: new Date().toISOString()
  })

  // Log error in development
  if (import.meta.env.DEV) {
    console.error('[Global Error]:', error)
    console.error('Context:', context)
  }

  // Handle the error with our error handling service
  // We don't await this because this is a synchronous event handler
  errorHandlingService.handleError(error, {
    showToast: !import.meta.env.DEV && shouldShowUserFeedback(error),
    context: {
      ...context,
      isGlobalError: true
    }
  }).catch(e => {
    // If error handling itself fails, fall back to basic reporting
    console.error('Error handling failed:', e)
  })
}

/**
 * Determine if user feedback should be shown for an error
 */
function shouldShowUserFeedback(error: Error): boolean {
  // Don't show feedback for network errors (handled elsewhere)
  if (
    error.name === 'NetworkError' ||
    error.message.includes('network') ||
    error.message.includes('fetch')
  ) {
    return false
  }

  // Don't show for script load errors (often caused by ad blockers)
  if (error.message.includes('script') && error.message.includes('load')) {
    return false
  }

  // Show feedback for all other errors
  return true
} 
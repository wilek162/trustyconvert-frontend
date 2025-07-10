/**
 * Recovery Strategies
 *
 * A collection of strategies to recover from different types of errors.
 * These strategies are registered with the ErrorHandlingService to
 * provide automatic recovery capabilities.
 */

import { debugLog, debugError } from '@/lib/utils/debug'
import type { ErrorContext } from './ErrorHandlingService'
import { ApiError, NetworkError, SessionError } from './error-types'
import sessionManager from '@/lib/services/sessionManager'

/**
 * Recovery strategy for session errors
 * Tries to reinitialize the session
 */
export async function recoverSessionError(error: Error, context: ErrorContext): Promise<boolean> {
  if (!(error instanceof SessionError)) return false
  
  try {
    debugLog('Attempting to recover from session error by reinitializing session')
    
    // Try to reinitialize the session with force=true to get a fresh session
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
 * Uses exponential backoff based on retry count
 */
export async function recoverNetworkError(error: Error, context: ErrorContext): Promise<boolean> {
  if (!(error instanceof NetworkError)) return false
  
  // Get retry count from context or default to 0
  const retryCount = context.retryCount || 0
  const maxRetries = context.maxRetries || 3
  
  // Don't retry if we've reached the max retries
  if (retryCount >= maxRetries) {
    debugLog(`Network recovery aborted: max retries (${maxRetries}) reached`)
    return false
  }
  
  try {
    // Implement exponential backoff
    const backoffTime = Math.pow(2, retryCount) * 500 // 500ms, 1s, 2s, 4s, etc.
    
    debugLog(`Network recovery: waiting ${backoffTime}ms before retry ${retryCount + 1}/${maxRetries}`)
    
    // Wait for backoff time
    await new Promise(resolve => setTimeout(resolve, backoffTime))
    
    // Update retry count in context
    context.retryCount = retryCount + 1
    
    return true
  } catch (recoveryError) {
    debugError('Error during network recovery:', recoveryError)
    return false
  }
}

/**
 * Recovery strategy for API 401/403 errors
 * Tries to reestablish session authentication
 */
export async function recoverAuthError(error: Error, context: ErrorContext): Promise<boolean> {
  // Check if this is an API error with 401 or 403 status
  if (!(error instanceof ApiError) || 
      (error.statusCode !== 401 && error.statusCode !== 403)) {
    return false
  }
  
  try {
    debugLog('Attempting to recover from auth error by reestablishing session')
    
    // Force a new session since the current one is invalid
    const success = await sessionManager.initSession(true)
    
    if (success) {
      debugLog('Auth recovery successful - new session established')
      return true
    }
    
    debugError('Auth recovery failed')
    return false
  } catch (recoveryError) {
    debugError('Error during auth recovery:', recoveryError)
    return false
  }
}

/**
 * Recovery strategy for rate limiting (429 Too Many Requests)
 * Waits for the recommended time before retrying
 */
export async function recoverRateLimitError(error: Error, context: ErrorContext): Promise<boolean> {
  // Check if this is a rate limit error
  if (!(error instanceof ApiError) || error.statusCode !== 429) {
    return false
  }
  
  try {
    // Try to extract retry-after header if available in the error details
    let retryAfter = 5000 // Default: 5 seconds
    
    if (error.details && typeof error.details === 'object' && 'retry-after' in error.details) {
      const headerValue = (error.details as any)['retry-after']
      if (typeof headerValue === 'string') {
        // Could be seconds or a date
        if (/^\d+$/.test(headerValue)) {
          // If it's a number, interpret as seconds
          retryAfter = parseInt(headerValue, 10) * 1000
        } else {
          // Try to parse as date
          try {
            const date = new Date(headerValue)
            retryAfter = date.getTime() - Date.now()
          } catch (e) {
            // Keep default if parsing fails
          }
        }
      }
    }
    
    // Make sure retry time is reasonable (between 1-60 seconds)
    retryAfter = Math.max(1000, Math.min(retryAfter, 60000))
    
    debugLog(`Rate limit recovery: waiting ${retryAfter}ms before retry`)
    
    // Wait for the specified time
    await new Promise(resolve => setTimeout(resolve, retryAfter))
    
    return true
  } catch (recoveryError) {
    debugError('Error during rate limit recovery:', recoveryError)
    return false
  }
}

/**
 * Recovery strategy for server errors (5xx)
 * Uses increasing backoff with jitter
 */
export async function recoverServerError(error: Error, context: ErrorContext): Promise<boolean> {
  // Check if this is a server error
  if (!(error instanceof ApiError) || error.statusCode < 500) {
    return false
  }
  
  // Get retry count from context or default to 0
  const retryCount = context.retryCount || 0
  const maxRetries = context.maxRetries || 3
  
  // Don't retry if we've reached the max retries
  if (retryCount >= maxRetries) {
    debugLog(`Server error recovery aborted: max retries (${maxRetries}) reached`)
    return false
  }
  
  try {
    // Implement exponential backoff with jitter
    const baseDelay = Math.pow(1.5, retryCount) * 1000 // 1s, 1.5s, 2.25s, etc.
    const jitter = baseDelay * 0.2 // 20% jitter
    const backoffTime = baseDelay + (Math.random() * jitter)
    
    debugLog(`Server error recovery: waiting ${Math.round(backoffTime)}ms before retry ${retryCount + 1}/${maxRetries}`)
    
    // Wait for backoff time
    await new Promise(resolve => setTimeout(resolve, backoffTime))
    
    // Update retry count in context
    context.retryCount = retryCount + 1
    
    return true
  } catch (recoveryError) {
    debugError('Error during server error recovery:', recoveryError)
    return false
  }
}

/**
 * Register all recovery strategies with the error handling service
 */
export function registerRecoveryStrategies(service: any): void {
  // Type should be ErrorHandlingService but we avoid circular imports
  service.registerRecoveryStrategy('SessionError', recoverSessionError)
  service.registerRecoveryStrategy('NetworkError', recoverNetworkError)
  service.registerRecoveryStrategy('ApiError:401', recoverAuthError)
  service.registerRecoveryStrategy('ApiError:403', recoverAuthError)
  service.registerRecoveryStrategy('ApiError:429', recoverRateLimitError)
  service.registerRecoveryStrategy('ApiError:5xx', recoverServerError)
} 
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

/**
 * Initialize the error handling system
 * Should be called during application startup
 */
export function initErrorHandling(): void {
  // Register recovery strategies
  registerRecoveryStrategies(errorHandlingService)
  
  // Set up global error handlers
  if (typeof window !== 'undefined') {
    errorHandlingService.initGlobalHandlers()
  }
  
  debugLog('Error handling system initialized')
} 
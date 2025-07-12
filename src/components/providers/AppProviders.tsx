import React, { useEffect } from 'react'
import { QueryProvider } from './QueryProvider'
import { LanguageProvider } from './LanguageProvider'
import ToastListener from './ToastListener'
import { ToastProvider } from './ToastProvider'
import { SessionProvider } from './SessionProvider'
import { initializeMonitoring } from '@/lib/monitoring/init'
import { initErrorHandling } from '@/lib/errors/initErrorHandling'
import { debugLog } from '@/lib/utils/debug'

interface AppProvidersProps {
  children: React.ReactNode
}

/**
 * Application Providers
 * 
 * Centralizes all application providers and initializes services:
 * - QueryProvider: Manages data fetching and caching
 * - ToastProvider: Provides toast notification functionality
 * - SessionProvider: Manages user session state
 * - LanguageProvider: Handles internationalization
 */
export function AppProviders({ children }: AppProvidersProps) {
  // Initialize monitoring, error handling, and other services
  useEffect(() => {
    const initialize = async () => {
      try {
        // Initialize monitoring first for error tracking
        await initializeMonitoring()
        
        // Initialize error handling system
        initErrorHandling()
        
        debugLog('Application services initialized')
      } catch (error) {
        console.error('Failed to initialize application services:', error)
      }
    }
    
    initialize()
  }, [])
  
  // Make sure QueryProvider is the outermost provider
  return (
    <QueryProvider>
      <ToastProvider>
        <SessionProvider>
          <LanguageProvider>
            {children}
            <ToastListener />
          </LanguageProvider>
        </SessionProvider>
      </ToastProvider>
    </QueryProvider>
  )
}

// Export as both default and named export for backward compatibility
export default AppProviders

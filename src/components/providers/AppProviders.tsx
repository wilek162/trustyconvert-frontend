import React, { useEffect } from 'react'
import { QueryProvider } from './QueryProvider'
import { LanguageProvider } from './LanguageProvider'
import ToastListener from './ToastListener'
import { initializeMonitoring } from '@/lib/monitoring/init'
import { initErrorHandling } from '@/lib/errors/initErrorHandling'
import { debugLog } from '@/lib/utils/debug'

interface AppProvidersProps {
  children: React.ReactNode
}

/**
 * Application Providers
 * 
 * Centralizes all application providers and initializes services
 */
export default function AppProviders({ children }: AppProvidersProps) {
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
  
  return (
    <QueryProvider>
      <LanguageProvider>
        {children}
        <ToastListener />
      </LanguageProvider>
    </QueryProvider>
  )
}

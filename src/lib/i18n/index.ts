/**
 * Centralized exports for i18n functionality
 * This file exports all the necessary components, hooks, and utilities for i18n
 */

// Export config
export * from './config'

// Export translations
export * from './translations'

// Export utilities
export * from './utils'

// Export hooks
export { useTranslation } from './hooks/useTranslation'

// Export middleware
export { createLanguageMiddleware, getAlternateLanguages, detectBrowserLanguage } from './middleware' 
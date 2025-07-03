/**
 * Toast Service
 * 
 * A centralized service for displaying toast notifications using sonner.
 * This provides a consistent interface for showing notifications across the application.
 */

import { showToast } from '@/components/providers/ToastListener'
import { MESSAGE_TEMPLATES } from '@/lib/utils/messageUtils'

// Toast type
export type ToastType = 'success' | 'error' | 'warning' | 'info'

// Toast options
export interface ToastOptions {
  /** Duration in milliseconds (0 for no auto-dismiss) */
  duration?: number
  
  /** Whether to show a close button */
  dismissible?: boolean
  
  /** Custom message ID for tracking/analytics */
  id?: string
  
  /** Additional data to pass to the toast */
  data?: Record<string, any>
}

// Default durations by type
const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 5000,
  error: 10000,
  warning: 8000,
  info: 5000
}

// Type for message template categories
type MessageTemplateCategory = keyof typeof MESSAGE_TEMPLATES

// Helper type to get the keys of a nested object
type NestedKeys<T> = T extends object ? keyof T : never

/**
 * Toast service for displaying notifications
 */
class ToastService {
  private static instance: ToastService
  
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  public static getInstance(): ToastService {
    if (!ToastService.instance) {
      ToastService.instance = new ToastService()
    }
    return ToastService.instance
  }
  
  /**
   * Show a toast notification
   */
  public show(
    message: string,
    type: ToastType = 'info',
    options: ToastOptions = {}
  ): void {
    const duration = options.duration || DEFAULT_DURATIONS[type]
    showToast(message, type, duration, options)
  }
  
  /**
   * Show a success toast
   */
  public success(message: string, options: ToastOptions = {}): void {
    this.show(message, 'success', options)
  }
  
  /**
   * Show an error toast
   */
  public error(message: string, options: ToastOptions = {}): void {
    this.show(message, 'error', options)
  }
  
  /**
   * Show a warning toast
   */
  public warning(message: string, options: ToastOptions = {}): void {
    this.show(message, 'warning', options)
  }
  
  /**
   * Show an info toast
   */
  public info(message: string, options: ToastOptions = {}): void {
    this.show(message, 'info', options)
  }
  
  /**
   * Show a loading toast that can be updated later
   */
  public loading(message: string = 'Loading...', options: ToastOptions = {}): string {
    const id = `loading-${Date.now()}`
    showToast(message, 'info', 0, { ...options, id })
    return id
  }
  
  /**
   * Update a toast by ID
   */
  public update(
    id: string,
    message: string,
    type: ToastType = 'info',
    options: ToastOptions = {}
  ): void {
    const duration = options.duration || DEFAULT_DURATIONS[type]
    showToast(message, type, duration, { ...options, id })
  }
  
  /**
   * Show a message from the template
   */
  public showTemplate(
    templateKey: string,
    type: ToastType = 'info',
    options: ToastOptions = {}
  ): void {
    // Parse the template key path (e.g., "conversion.started")
    const [categoryKey, messageKey] = templateKey.split('.')
    
    let message: string
    
    // Type guard to check if categoryKey is a valid category
    const isValidCategory = (key: string): key is MessageTemplateCategory => {
      return key in MESSAGE_TEMPLATES
    }
    
    if (categoryKey && messageKey && isValidCategory(categoryKey)) {
      // Get the message from the specified category
      const category = MESSAGE_TEMPLATES[categoryKey]
      
      // Check if the messageKey exists in the category
      if (typeof category === 'object' && messageKey in category) {
        // Need to use type assertion here since TypeScript can't infer the type correctly
        message = (category as Record<string, string>)[messageKey]
      } else {
        message = templateKey
      }
    } else if ('generic' in MESSAGE_TEMPLATES && templateKey in MESSAGE_TEMPLATES.generic) {
      // Try to get the message from the generic category
      message = MESSAGE_TEMPLATES.generic[templateKey as keyof typeof MESSAGE_TEMPLATES.generic]
    } else {
      // Fallback to using the key itself
      message = templateKey
    }
    
    this.show(message, type, options)
  }
}

// Export singleton instance
export const toastService = ToastService.getInstance()

// Export convenience functions
export const showSuccess = (message: string, options: ToastOptions = {}): void => 
  toastService.success(message, options)

export const showError = (message: string, options: ToastOptions = {}): void => 
  toastService.error(message, options)

export const showWarning = (message: string, options: ToastOptions = {}): void => 
  toastService.warning(message, options)

export const showInfo = (message: string, options: ToastOptions = {}): void => 
  toastService.info(message, options)

export const showLoading = (message: string = 'Loading...', options: ToastOptions = {}): string => 
  toastService.loading(message, options)

export const updateToast = (
  id: string,
  message: string,
  type: ToastType = 'info',
  options: ToastOptions = {}
): void => toastService.update(id, message, type, options)

export const showTemplate = (
  templateKey: string,
  type: ToastType = 'info',
  options: ToastOptions = {}
): void => toastService.showTemplate(templateKey, type, options)
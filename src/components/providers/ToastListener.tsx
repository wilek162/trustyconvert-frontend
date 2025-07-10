/**
 * Toast Event Listener Component
 *
 * Listens for custom toast events and displays them using the sonner toast component.
 * This allows showing toasts from non-React code or from Astro components.
 */

import { useCallback } from 'react'
import { toast, Toaster } from 'sonner'
import { Button } from '@/components/ui/button'
import { X, AlertCircle, CheckCircle, Info, RefreshCw } from 'lucide-react'

// Toast type
export type ToastType = 'success' | 'error' | 'warning' | 'info'

// Toast options
export interface ToastOptions {
  id?: string
  duration?: number
  dismissible?: boolean
  action?: {
    label: string
    onClick: () => void
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  }
  retryAction?: () => void
  description?: string
  data?: Record<string, any>
}

/**
 * Show a toast notification
 * 
 * @param message Message to display
 * @param type Toast type
 * @param duration Duration in milliseconds (0 for no auto-dismiss)
 * @param options Additional options
 * @returns Toast ID
 */
export function showToast(
  message: string,
  type: ToastType = 'info',
  duration: number = 5000,
  options: ToastOptions = {}
): string {
  const { id, dismissible = true, action, retryAction, description, ...rest } = options
  
  // Generate a unique id if none provided
  const toastId = id || `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  // Configure toast options based on type
  const toastOptions: any = {
    id: toastId,
    duration,
    ...rest
  }
  
  // Add dismiss button if dismissible
  if (dismissible) {
    toastOptions.actionButton = (
      <Button 
        variant="ghost" 
        size="icon"
        onClick={() => toast.dismiss(toastId)}
        className="h-6 w-6"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </Button>
    )
  }

  // Add retry button if provided
  if (retryAction) {
    toastOptions.action = {
      label: 'Retry',
      onClick: retryAction
    }
  }
  
  // Add custom action button if provided (overrides retry)
  if (action) {
    toastOptions.action = {
      label: action.label,
      onClick: action.onClick,
      variant: action.variant || 'secondary'
    }
  }
  
  // Set description if provided
  if (description) {
    toastOptions.description = description
  }
  
  // Show toast based on type
  switch (type) {
    case 'success':
      toast.success(message, toastOptions)
      break
    case 'error':
      toast.error(message, toastOptions)
      break
    case 'warning':
      toast.warning(message, toastOptions)
      break
    default:
      toast.info(message, toastOptions)
  }
  
  return toastId
}

/**
 * Update an existing toast
 */
export function updateToast(
  id: string, 
  message: string, 
  type: ToastType = 'info', 
  options: ToastOptions = {}
): void {
  const { dismissible = true, action, retryAction, description, ...rest } = options
  
  // Configure toast options
  const toastOptions: any = {
    id,
    ...rest
  }
  
  // Add dismiss button if dismissible
  if (dismissible) {
    toastOptions.actionButton = (
      <Button 
        variant="ghost" 
        size="icon"
        onClick={() => toast.dismiss(id)}
        className="h-6 w-6"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </Button>
    )
  }

  // Add retry button if provided
  if (retryAction) {
    toastOptions.action = {
      label: 'Retry',
      onClick: retryAction
    }
  }
  
  // Add custom action button if provided (overrides retry)
  if (action) {
    toastOptions.action = {
      label: action.label,
      onClick: action.onClick,
      variant: action.variant || 'secondary'
    }
  }
  
  // Set description if provided
  if (description) {
    toastOptions.description = description
  }
  
  // Update toast based on type
  switch (type) {
    case 'success':
      toast.success(message, toastOptions)
      break
    case 'error':
      toast.error(message, toastOptions)
      break
    case 'warning':
      toast.warning(message, toastOptions)
      break
    default:
      toast.info(message, toastOptions)
  }
}

/**
 * Toast component with improved UI
 */
function CustomToast({ toast: toastData }: { toast: any }) {
  const { id, title, type, description, action, actionButton } = toastData

  // Determine icon based on type
  let icon = null
  switch (type) {
    case 'success':
      icon = <CheckCircle className="h-5 w-5 text-green-500" />
      break
    case 'error':
      icon = <AlertCircle className="h-5 w-5 text-red-500" />
      break
    case 'warning':
      icon = <AlertCircle className="h-5 w-5 text-amber-500" />
      break
    case 'info':
      icon = <Info className="h-5 w-5 text-blue-500" />
      break
    case 'loading':
      icon = <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
      break
  }

  // Action button component
  const ActionButton = useCallback(() => {
    if (!action) return null
    
    return (
      <Button
        size="sm"
        variant={action.variant || "secondary"}
        onClick={() => {
          action.onClick?.()
          if (action.closeToast !== false) {
            toast.dismiss(id)
          }
        }}
        className="mt-2"
      >
        {action.label}
      </Button>
    )
  }, [action, id])

  return (
    <div className="flex w-full gap-3 p-1">
      {icon && <div className="mt-1 flex-shrink-0">{icon}</div>}
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
        {action && <div className="mt-1"><ActionButton /></div>}
      </div>
      {actionButton && (
        <div className="flex-shrink-0 self-start">
          {actionButton}
        </div>
      )}
    </div>
  )
}

/**
 * Toast listener component
 */
export default function ToastListener() {
  return (
    <Toaster 
      position="bottom-right" 
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "bg-background border rounded-md p-4 shadow-lg",
          title: "text-foreground",
          description: "text-muted-foreground text-sm",
          success: "border-green-500/20 bg-green-500/10",
          error: "border-red-500/20 bg-red-500/10",
          warning: "border-amber-500/20 bg-amber-500/10",
          info: "border-blue-500/20 bg-blue-500/10",
        },
        duration: 5000,
      }}
      richColors
    />
  )
}

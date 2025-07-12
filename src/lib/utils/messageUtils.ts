/**
 * Message utilities
 * 
 * Re-exports toast functions and message templates for convenient use in components
 */

import { showSuccess, showError, showInfo, showWarning } from '@/lib/services/toastService'
import { MESSAGE_TEMPLATES } from '@/lib/constants/messages'

export { 
  showSuccess, 
  showError, 
  showInfo, 
  showWarning,
  MESSAGE_TEMPLATES 
} 
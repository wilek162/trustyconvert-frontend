/**
 * Toast Event Listener Component
 *
 * Listens for custom toast events and displays them using the sonner toast component.
 * This allows showing toasts from non-React code or from Astro components.
 */

import React, { useEffect } from 'react'
import { toast } from 'sonner'

// Define the ToastType locally
type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastEvent extends CustomEvent {
	detail: {
		message: string
		type: ToastType
		duration?: number
	}
}

/**
 * Component that listens for custom toast events and shows toasts
 */
export function ToastListener(): null {
	useEffect(() => {
		// Event handler for custom toast events
		const handleToastEvent = (event: Event): void => {
			const toastEvent = event as ToastEvent
			const { message, type, duration } = toastEvent.detail

			switch (type) {
				case 'success':
					toast.success(message, { duration })
					break
				case 'error':
					toast.error(message, { duration })
					break
				case 'warning':
					toast.warning(message, { duration })
					break
				case 'info':
				default:
					toast.info(message, { duration })
					break
			}
		}

		// Add event listener
		window.addEventListener('toast:show', handleToastEvent)

		// Clean up
		return () => {
			window.removeEventListener('toast:show', handleToastEvent)
		}
	}, [])

	// This component doesn't render anything
	return null
}

/**
 * Utility function to show a toast from anywhere in the application
 *
 * @param message - Toast message to display
 * @param type - Toast type (success, error, warning, info)
 * @param duration - Display duration in milliseconds
 */
export function showToast(message: string, type: ToastType = 'info', duration?: number): void {
	window.dispatchEvent(
		new CustomEvent('toast:show', {
			detail: {
				message,
				type,
				duration
			}
		})
	)
}

export default ToastListener

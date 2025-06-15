/**
 * Toast Event Listener Component
 *
 * Listens for custom toast events and displays them using the Toast component.
 * This allows showing toasts from non-React code or from Astro components.
 */

import React, { useEffect } from 'react'
import { useToast } from '@/components/ui/toast'

// Define the ToastType locally since we can't import it
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
	const { addToast } = useToast()

	useEffect(() => {
		// Event handler for custom toast events
		const handleToastEvent = (event: Event): void => {
			const toastEvent = event as ToastEvent
			const { message, type, duration } = toastEvent.detail

			addToast({
				message,
				type,
				duration
			})
		}

		// Add event listener
		window.addEventListener('toast:show', handleToastEvent)

		// Clean up
		return () => {
			window.removeEventListener('toast:show', handleToastEvent)
		}
	}, [addToast])

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

/**
 * Convenience methods for different toast types
 */
export const toast = {
	success: (message: string, duration?: number) => showToast(message, 'success', duration),
	error: (message: string, duration?: number) => showToast(message, 'error', duration),
	warning: (message: string, duration?: number) => showToast(message, 'warning', duration),
	info: (message: string, duration?: number) => showToast(message, 'info', duration)
}

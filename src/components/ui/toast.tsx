/**
 * Toast Notification Component
 *
 * Provides a system for displaying non-intrusive notifications to users,
 * including success messages, errors, warnings, and general information.
 */

import React, { createContext, useContext, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

// Toast types for different notification styles
export type ToastType = 'success' | 'error' | 'warning' | 'info'

// Toast position options
export type ToastPosition =
	| 'top-right'
	| 'top-left'
	| 'bottom-right'
	| 'bottom-left'
	| 'top-center'
	| 'bottom-center'

// Toast item interface
export interface ToastItem {
	id: string
	message: string
	type: ToastType
	duration?: number
	onClose?: () => void
}

// Toast context interface
interface ToastContextType {
	toasts: ToastItem[]
	addToast: (toast: Omit<ToastItem, 'id'>) => string
	removeToast: (id: string) => void
	clearToasts: () => void
}

// Default toast duration in milliseconds
const DEFAULT_DURATION = 5000

// Create context with default values
const ToastContext = createContext<ToastContextType>({
	toasts: [],
	addToast: () => '',
	removeToast: () => {},
	clearToasts: () => {}
})

/**
 * Toast provider component that manages toast state
 */
export function ToastProvider({
	children,
	position = 'bottom-right',
	maxToasts = 5
}: {
	children: React.ReactNode
	position?: ToastPosition
	maxToasts?: number
}): React.ReactElement {
	const [toasts, setToasts] = useState<ToastItem[]>([])

	// Add a new toast to the list
	const addToast = (toast: Omit<ToastItem, 'id'>): string => {
		const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
		const newToast: ToastItem = {
			...toast,
			id,
			duration: toast.duration || DEFAULT_DURATION
		}

		setToasts((prevToasts) => {
			// Limit the number of toasts
			const updatedToasts = [newToast, ...prevToasts].slice(0, maxToasts)
			return updatedToasts
		})

		return id
	}

	// Remove a toast by ID
	const removeToast = (id: string): void => {
		setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id))
	}

	// Clear all toasts
	const clearToasts = (): void => {
		setToasts([])
	}

	return (
		<ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
			{children}
			<ToastContainer position={position} />
		</ToastContext.Provider>
	)
}

/**
 * Hook to access toast functionality
 */
export function useToast(): ToastContextType {
	const context = useContext(ToastContext)

	if (context === undefined) {
		throw new Error('useToast must be used within a ToastProvider')
	}

	return context
}

/**
 * Toast container component that renders all active toasts
 */
function ToastContainer({ position = 'bottom-right' }: { position: ToastPosition }): React.ReactElement {
	const { toasts } = useToast()

	const positionClasses = {
		'top-right': 'top-4 right-4 flex-col',
		'top-left': 'top-4 left-4 flex-col',
		'bottom-right': 'bottom-4 right-4 flex-col-reverse',
		'bottom-left': 'bottom-4 left-4 flex-col-reverse',
		'top-center': 'top-4 left-1/2 -translate-x-1/2 flex-col',
		'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 flex-col-reverse'
	}

	return (
		<div
			className={cn(
				'pointer-events-none fixed z-50 flex w-full max-w-xs gap-2 sm:max-w-md',
				positionClasses[position]
			)}
			aria-live="polite"
			aria-atomic="true"
		>
			{toasts.map((toast) => (
				<Toast key={toast.id} toast={toast} />
			))}
		</div>
	)
}

/**
 * Individual toast component
 */
function Toast({ toast }: { toast: ToastItem }): React.ReactElement {
	const { removeToast } = useToast()
	const { id, message, type, duration, onClose } = toast

	// Auto-dismiss toast after duration
	useEffect(() => {
		if (!duration) return

		const timer = setTimeout(() => {
			handleClose()
		}, duration)

		return () => clearTimeout(timer)
	}, [duration])

	// Handle close with callback
	const handleClose = (): void => {
		removeToast(id)
		if (onClose) onClose()
	}

	// Type-specific styles
	const typeStyles = {
		success: 'bg-green-50 border-green-200 text-green-800',
		error: 'bg-red-50 border-red-200 text-red-800',
		warning: 'bg-amber-50 border-amber-200 text-amber-800',
		info: 'bg-blue-50 border-blue-200 text-blue-800'
	}

	// Type-specific icons
	const icons = {
		success: (
			<svg
				className="h-5 w-5"
				fill="currentColor"
				viewBox="0 0 20 20"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					fillRule="evenodd"
					d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
					clipRule="evenodd"
				/>
			</svg>
		),
		error: (
			<svg
				className="h-5 w-5"
				fill="currentColor"
				viewBox="0 0 20 20"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					fillRule="evenodd"
					d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
					clipRule="evenodd"
				/>
			</svg>
		),
		warning: (
			<svg
				className="h-5 w-5"
				fill="currentColor"
				viewBox="0 0 20 20"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					fillRule="evenodd"
					d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
					clipRule="evenodd"
				/>
			</svg>
		),
		info: (
			<svg
				className="h-5 w-5"
				fill="currentColor"
				viewBox="0 0 20 20"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					fillRule="evenodd"
					d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
					clipRule="evenodd"
				/>
			</svg>
		)
	}

	return (
		<div
			className={cn(
				'pointer-events-auto w-full rounded-lg border p-4 shadow-lg transition-all duration-300 ease-in-out',
				'flex items-start',
				typeStyles[type]
			)}
			role="alert"
			aria-live="assertive"
		>
			<div className="mr-3 flex-shrink-0">{icons[type]}</div>
			<div className="flex-1">
				<p className="text-sm">{message}</p>
			</div>
			<button
				type="button"
				className="ml-4 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md text-current opacity-50 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-current"
				onClick={handleClose}
				aria-label="Close"
			>
				<span className="sr-only">Close</span>
				<svg
					className="h-3.5 w-3.5"
					fill="none"
					viewBox="0 0 14 14"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						d="M1 1L13 13M1 13L13 1"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</button>
		</div>
	)
}

/**
 * Utility function to show a toast outside of React components
 * Requires a ToastProvider to be set up in the app
 */
export function showToast(
	message: string,
	type: ToastType = 'info',
	duration: number = DEFAULT_DURATION
): void {
	// Find the toast context in the DOM
	const event = new CustomEvent('toast:show', {
		detail: { message, type, duration }
	})

	window.dispatchEvent(event)
}

export default ToastProvider

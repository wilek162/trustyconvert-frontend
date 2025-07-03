import { useCallback } from 'react'
import { toast } from 'sonner'

export type ToastVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info'

export interface ToastOptions {
	id?: string
	duration?: number
	action?: {
		label: string
		onClick: () => void
	}
}

export function useToast() {
	const success = useCallback(
		(message: string, options?: ToastOptions) => {
			return toast.success(message, options)
		},
		[]
	)

	const error = useCallback(
		(message: string, options?: ToastOptions) => {
			return toast.error(message, options)
		},
		[]
	)

	const warning = useCallback(
		(message: string, options?: ToastOptions) => {
			return toast.warning(message, options)
		},
		[]
	)

	const info = useCallback(
		(message: string, options?: ToastOptions) => {
			return toast(message, options)
		},
		[]
	)

	return {
		success,
		error,
		warning,
		info,
		toast
	}
} 
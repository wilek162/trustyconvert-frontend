import * as React from 'react'
import { Toaster } from 'sonner'

export function ToastProvider({ children }: { children: React.ReactNode }) {
	return (
		<>
			{children}
			<Toaster
				position="top-right"
				toastOptions={{
					className: 'toast-custom',
					duration: 4000,
					style: {
						background: 'var(--color-background)',
						color: 'var(--color-secondary)',
						border: '1px solid var(--color-surface)'
					}
				}}
			/>
		</>
	)
}

export default ToastProvider

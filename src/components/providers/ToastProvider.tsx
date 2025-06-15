import * as React from 'react'
import { Toaster } from 'sonner'

import { ToastProvider as ToastProviderUI } from '@/components/ui/toast'

export function ToastProvider({ children }: { children: React.ReactNode }) {
	return (
		<>
			<ToastProviderUI>{children}</ToastProviderUI>
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

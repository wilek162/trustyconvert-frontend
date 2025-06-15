import * as React from 'react'

import { ToastProvider as ToastProviderUI } from '@/components/ui/Toast'

export function ToastProvider({ children }: { children: React.ReactNode }) {
	return (
		<>
			<ToastProviderUI>{children}</ToastProviderUI>
		</>
	)
}

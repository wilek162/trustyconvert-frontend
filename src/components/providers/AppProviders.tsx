/**
 * Application Providers Component
 *
 * Wraps the application with all necessary providers for error handling,
 * toast notifications, and other global functionality.
 */

import React from 'react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { ToastProvider } from '@/components/ui/Toast'
import { ToastListener } from '@/components/providers/ToastListener'

interface AppProvidersProps {
	/**
	 * Child components to be wrapped with providers
	 */
	children: React.ReactNode
}

/**
 * AppProviders component that wraps the application with all necessary providers
 */
export function AppProviders({ children }: AppProvidersProps): JSX.Element {
	return (
		<ErrorBoundary>
			<ToastProvider position="bottom-right" maxToasts={5}>
				<ToastListener />
				{children}
			</ToastProvider>
		</ErrorBoundary>
	)
}

/**
 * Higher-order component that wraps a component with all application providers
 *
 * @param Component - Component to wrap
 * @returns Wrapped component with all providers
 */
export function withAppProviders<P extends object>(Component: React.ComponentType<P>): React.FC<P> {
	const displayName = Component.displayName || Component.name || 'Component'

	const ComponentWithProviders: React.FC<P> = (props) => {
		return (
			<AppProviders>
				<Component {...props} />
			</AppProviders>
		)
	}

	ComponentWithProviders.displayName = `withAppProviders(${displayName})`

	return ComponentWithProviders
}

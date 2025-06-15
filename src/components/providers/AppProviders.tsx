/**
 * Application Providers Component
 *
 * Wraps the application with all necessary providers for error handling,
 * toast notifications, and other global functionality.
 */

import * as React from 'react'
import { ErrorBoundary } from '@/components/common'
import { ToastProvider, QueryProvider, ToastListener } from '@/components/providers'

export interface AppProvidersProps {
	/**
	 * Child components to be wrapped with providers
	 */
	children: React.ReactNode
	enableDevtools?: boolean
}

/**
 * AppProviders component that wraps the application with all necessary providers
 */
export function AppProviders({ children, enableDevtools = false }: AppProvidersProps): JSX.Element {
	return (
		<ErrorBoundary>
			<QueryProvider enableDevtools={enableDevtools}>
				<ToastProvider>
					<ToastListener />
					{children}
				</ToastProvider>
			</QueryProvider>
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

export default AppProviders

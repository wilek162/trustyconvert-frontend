/**
 * Application Providers Component
 *
 * Wraps the application with all necessary providers for error handling,
 * toast notifications, and other global functionality.
 */

import * as React from 'react'
import type { ReactNode } from 'react'
import { ErrorBoundary } from '@/components/common'
import { ToastProvider, QueryProvider, ToastListener } from '@/components/providers'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { LanguageProvider } from './LanguageProvider'

// Import API initialization module
// This will initialize the API session when the module is imported
import '@/lib/api/initializeApi'

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
	const [queryClient] = React.useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 60 * 1000,
						retry: 1
					}
				}
			})
	)

	return (
		<ErrorBoundary>
			<QueryClientProvider client={queryClient}>
				<LanguageProvider>
					<ToastProvider>
						<ToastListener />
						{children}
					</ToastProvider>
				</LanguageProvider>
				{import.meta.env.DEV && <ReactQueryDevtools />}
			</QueryClientProvider>
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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

const queryClient = new QueryClient()

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
	return (
		<QueryClientProvider client={queryClient}>
			{children}
			{import.meta.env.DEV && (
				<React.Suspense fallback={null}>
					<ReactQueryDevtoolsLazy />
				</React.Suspense>
			)}
		</QueryClientProvider>
	)
}

// ⛔ Do not import this at the top!
const ReactQueryDevtoolsLazy = React.lazy(() =>
	import('@tanstack/react-query-devtools').then((mod) => ({
		default: mod.ReactQueryDevtools
	}))
)

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

const queryClient = new QueryClient()

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
	return (
		<QueryClientProvider client={queryClient}>
			{children}
			{import.meta.env.DEV && <LazyDevtools />}
		</QueryClientProvider>
	)
}

const LazyDevtools = () => {
	const Devtools = React.useMemo(
		() =>
			React.lazy(() =>
				import('@tanstack/react-query-devtools').then((mod) => ({
					default: mod.ReactQueryDevtools
				}))
			),
		[]
	)

	return (
		<React.Suspense fallback={null}>
			<Devtools initialIsOpen={false} />
		</React.Suspense>
	)
}

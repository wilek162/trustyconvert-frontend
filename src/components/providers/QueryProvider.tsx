import React, { lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60, // 1 minute
			retry: 1,
			refetchOnWindowFocus: false
		}
	}
})

interface QueryProviderProps {
	children: ReactNode
	enableDevtools?: boolean
}

// Lazy load devtools only in dev
const Devtools = lazy(() =>
	import('@tanstack/react-query-devtools').then((mod) => ({
		default: mod.ReactQueryDevtools
	}))
)

export function QueryProvider({ children, enableDevtools = false }: QueryProviderProps) {
	return (
		<QueryClientProvider client={queryClient}>
			{children}
			{enableDevtools && import.meta.env.DEV && (
				<Suspense fallback={null}>
					<Devtools initialIsOpen={false} />
				</Suspense>
			)}
		</QueryClientProvider>
	)
}

export default QueryProvider

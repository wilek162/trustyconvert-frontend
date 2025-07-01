import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import type { ReactNode } from 'react'

// Create a client
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
	children: React.ReactNode
	enableDevtools?: boolean
}

export function QueryProvider({ children, enableDevtools = false }: QueryProviderProps) {
	return (
		<QueryClientProvider client={queryClient}>
			{children}
			{enableDevtools && <ReactQueryDevtools initialIsOpen={false} />}
		</QueryClientProvider>
	)
}

export default QueryProvider

import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create a client
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			retry: 2, // Retry failed queries 2 times
			staleTime: 30000, // Data is fresh for 30 seconds
			refetchOnWindowFocus: false // Don't refetch on window focus
		}
	}
})

interface QueryProviderProps {
	children: React.ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

export default QueryProvider

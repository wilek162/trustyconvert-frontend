// src/components/providers/QueryProvider.tsx
import React, { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60,
			retry: 1,
			refetchOnWindowFocus: false
		}
	}
})

interface QueryProviderProps {
	children: ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
	const [Devtools, setDevtools] = useState<React.ReactNode>(null)

	useEffect(() => {
		if (import.meta.env.DEV) {
			import('@tanstack/react-query-devtools')
				.then((mod) => {
					setDevtools(<mod.ReactQueryDevtools initialIsOpen={false} />)
				})
				.catch((err) => {
					console.warn('[QueryProvider] Failed to load ReactQueryDevtools:', err)
				})
		}
	}, [])

	return (
		<QueryClientProvider client={queryClient}>
			{children}
			{Devtools}
		</QueryClientProvider>
	)
}

// src/components/providers/QueryProvider.tsx
import React, { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

interface QueryProviderProps {
	children: ReactNode
}

/**
 * QueryProvider component that configures React Query with optimized settings
 * - Implements aggressive caching for formats data
 * - Disables unnecessary refetching
 * - Configures retry behavior for different types of errors
 * - Loads React Query Devtools in development mode
 * - Client-side only - prevents SSR hydration issues
 */
export function QueryProvider({ children }: QueryProviderProps) {
	// Create a client instance with memoization
	// This ensures we have a stable QueryClient for client-side rendering
	const [queryClient] = useState(() => {
		return new QueryClient({
			defaultOptions: {
				queries: {
					// Default stale time of 5 minutes
					staleTime: 5 * 60 * 1000,
					// Keep unused data in cache for 30 minutes
					gcTime: 30 * 60 * 1000,
					// Enable queries by default
					enabled: true,
					// Retry failed queries up to 2 times
					retry: (failureCount, error: any) => {
						// Don't retry on client errors (4xx)
						if (error?.code?.startsWith('4')) {
							return false
						}
						return failureCount < 2
					},
					// Disable automatic refetching
					refetchOnWindowFocus: false,
					refetchOnMount: false,
					refetchOnReconnect: false,
					// Add exponential backoff for retries
					retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 10000)
				},
				mutations: {
					// Retry failed mutations up to 2 times
					retry: (failureCount, error: any) => {
						// Don't retry on client errors (4xx)
						if (error?.code?.startsWith('4')) {
							return false
						}
						return failureCount < 2
					},
					// Add exponential backoff for retries
					retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 10000)
				}
			}
		})
	})

	// Load React Query Devtools in development mode
	const [Devtools, setDevtools] = useState<React.ReactNode>(null)

	useEffect(() => {
		// Only load devtools in browser environment and in development mode
		if (typeof window !== 'undefined' && import.meta.env.DEV) {
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

export default QueryProvider

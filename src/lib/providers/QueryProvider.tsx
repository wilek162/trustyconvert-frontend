import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import type { ReactNode } from 'react'

interface Props {
	children: ReactNode
}

/**
 * QueryProvider component that configures React Query with optimized settings
 * - Implements aggressive caching for formats data
 * - Disables unnecessary refetching
 * - Configures retry behavior for different types of errors
 */
export function QueryProvider({ children }: Props) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						// Default stale time of 5 minutes
						staleTime: 5 * 60 * 1000,
						// Keep unused data in cache for 30 minutes
						gcTime: 30 * 60 * 1000,
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
	)

	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

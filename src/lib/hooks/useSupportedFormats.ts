import { useQuery } from '@tanstack/react-query'
import { client } from '@/lib/api/client'
import type { ConversionFormat } from '@/lib/api/types'

/**
 * Cache key for supported formats query
 * Using a constant ensures consistent cache key across the application
 */
const FORMATS_QUERY_KEY = ['supportedFormats'] as const

/**
 * Debug logging utility for development
 * Centralizes logging logic and makes it easy to disable in production
 */
const debug = {
	log: (message: string, data?: any) => {
		if (process.env.NODE_ENV === 'development') {
			console.log(`[useSupportedFormats] ${message}`, data || '')
		}
	},
	error: (message: string, error?: any) => {
		if (process.env.NODE_ENV === 'development') {
			console.error(`[useSupportedFormats] ${message}`, error || '')
		}
	}
}

/**
 * Query configuration for supported formats
 * Extracted to a constant for reuse and easier testing
 */
const QUERY_CONFIG = {
	staleTime: Infinity, // Never consider the data stale since formats rarely change
	gcTime: 24 * 60 * 60 * 1000, // Keep in cache for 24 hours
	refetchOnWindowFocus: false, // Don't refetch when window regains focus
	refetchOnMount: false, // Don't refetch on component mount
	refetchOnReconnect: false, // Don't refetch on network reconnection
	retry: (failureCount: number, error: any) => {
		// Don't retry on client errors (4xx)
		if (error?.status >= 400 && error?.status < 500) {
			return false
		}
		// Retry up to 2 times with exponential backoff
		return failureCount < 2
	}
} as const

/**
 * Hook for fetching and caching supported conversion formats
 *
 * Features:
 * - Automatic caching with React Query
 * - Error handling and retries
 * - Type-safe response handling
 * - Development-only debug logging
 *
 * @returns Object containing formats array, loading state, and error state
 */
export function useSupportedFormats() {
	const {
		data: formats = [],
		isLoading,
		error
	} = useQuery({
		queryKey: FORMATS_QUERY_KEY,
		queryFn: async () => {
			debug.log('Fetching supported formats')
			const response = await client.getSupportedFormats()
			debug.log('Formats fetched', { count: response.length })
			return response
		},
		...QUERY_CONFIG
	})

	return {
		formats,
		isLoading,
		error: error as Error | null
	}
}

import { useQuery, Query } from '@tanstack/react-query'
import { client } from '@/lib/api/client'
import type { ConversionStatusResponse } from '@/lib/api/client'
import { debugLog, debugError } from '@/lib/utils/debug'
import { handleError } from '@/lib/utils/errorHandling'

const POLLING_INTERVAL = 2000 // 2 seconds

interface UseConversionStatusOptions {
	jobId: string | null
	onError?: (error: string) => void
	pollingInterval?: number
	maxRetries?: number
}

type ConversionStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed'

/**
 * Hook for polling and tracking conversion status
 *
 * @param options - Configuration options
 * @returns Status information and control functions
 */
export function useConversionStatus({
	jobId: jobId,
	onError,
	pollingInterval = POLLING_INTERVAL,
	maxRetries = 2
}: UseConversionStatusOptions) {
	const query = useQuery<ConversionStatusResponse, Error>({
		queryKey: ['conversion-status', jobId],
		queryFn: async () => {
			if (!jobId) throw new Error('No task ID provided')
			debugLog('[useConversionStatus] Checking status', { jobId: jobId })
			try {
				// jobId is used as jobId for API calls
				const status = await client.getConversionStatus(jobId)

				// The apiClient.getConversionStatus now standardizes the response
				// so we don't need to manually handle field aliases anymore

				debugLog('[useConversionStatus] Status received', status)
				return status
			} catch (error) {
				debugError('[useConversionStatus] Status check failed', error)
				const errorMessage = handleError(error, {
					context: { component: 'useConversionStatus', jobId: jobId }
				})
				if (onError) onError(errorMessage)
				throw error
			}
		},
		enabled: !!jobId,
		refetchInterval: (q: Query<ConversionStatusResponse, Error>) => {
			const data = q.state.data
			const error = q.state.error
			if (!data) return pollingInterval
			if (data.status === 'completed' || data.status === 'failed' || error) {
				return false
			}
			return pollingInterval
		},
		retry: maxRetries,
		retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 30000)
	})

	return {
		status: (query.data?.status as ConversionStatus) ?? 'idle',
		progress: query.data?.progress ?? 0,
		downloadUrl: query.data?.download_url ?? null,
		fileName: query.data?.filename ?? null,
		fileSize: query.data?.file_size ?? null,
		isLoading: query.isLoading,
		error: query.error instanceof Error ? query.error.message : null,
		retryCount: query.failureCount,
		// Add a cancel method for future implementation
		cancel: () => {
			// This would be implemented if the API supports cancellation
			console.warn('Conversion cancellation not implemented')
		}
	}
}

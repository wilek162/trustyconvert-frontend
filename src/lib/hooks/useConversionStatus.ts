import { useQuery, Query } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/client'
import { debugLog, debugError } from '@/lib/utils/debug'
import type { z } from 'zod'
import { ConversionStatusResponseSchema } from '@/lib/api/client'

const POLLING_INTERVAL = 2000 // 2 seconds

interface UseConversionStatusOptions {
	taskId: string | null
	onError?: (error: string) => void
}

type ConversionStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed'
type ConversionStatusResponse = z.infer<typeof ConversionStatusResponseSchema>

export function useConversionStatus({ taskId, onError }: UseConversionStatusOptions) {
	const query = useQuery<ConversionStatusResponse, Error>({
		queryKey: ['conversion-status', taskId],
		queryFn: async () => {
			if (!taskId) throw new Error('No task ID provided')
			debugLog('[useConversionStatus] Checking status', { taskId })
			try {
				const status = await apiClient.getConversionStatus(taskId)
				debugLog('[useConversionStatus] Status received', status)
				return status
			} catch (error) {
				debugError('[useConversionStatus] Status check failed', error)
				if (onError) onError(error instanceof Error ? error.message : 'Unknown error')
				throw error
			}
		},
		enabled: !!taskId,
		refetchInterval: (q: Query<ConversionStatusResponse, Error>) => {
			const data = q.state.data
			const error = q.state.error
			if (!data) return POLLING_INTERVAL
			if (data.status === 'completed' || data.status === 'failed' || error) {
				return false
			}
			return POLLING_INTERVAL
		},
		retry: 2,
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
		retryCount: query.failureCount
	}
}

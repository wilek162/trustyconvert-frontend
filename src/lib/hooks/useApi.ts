import { useQuery, useMutation } from '@tanstack/react-query'
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import {
	initSession,
	uploadFile,
	convertFile,
	getJobStatus,
	getDownloadToken,
	closeSession
} from '@/lib/api/apiClient'
import type {
	ApiResponse,
	SessionInitResponse,
	UploadResponse,
	JobStatusResponse,
	DownloadTokenResponse,
	ConvertResponse,
	SessionCloseResponse
} from '@/lib/types/api'
import { API } from '@/lib/config/constants'

/**
 * Hook for initializing a session
 */
export function useSessionInit(options?: UseQueryOptions<ApiResponse<SessionInitResponse>>) {
	return useQuery({
		queryKey: ['session', 'init'],
		queryFn: () => initSession(),
		staleTime: Infinity, // Never stale until explicitly invalidated
		refetchOnWindowFocus: false,
		retry: 3,
		...options
	})
}

/**
 * Hook for uploading a file
 */
export function useFileUpload(
	options?: UseMutationOptions<
		ApiResponse<UploadResponse>,
		Error,
		{ file: File; jobId: string },
		unknown
	>
) {
	return useMutation({
		mutationFn: ({ file, jobId }) => uploadFile(file, jobId),
		retry: 2,
		...options
	})
}

/**
 * Hook for converting a file
 */
export function useFileConversion(
	options?: UseMutationOptions<
		ApiResponse<ConvertResponse>,
		Error,
		{ jobId: string; targetFormat: string },
		unknown
	>
) {
	return useMutation({
		mutationFn: ({ jobId, targetFormat }) => convertFile(jobId, targetFormat),
		retry: 1,
		...options
	})
}

/**
 * Hook for getting job status
 */
export function useJobStatus(
	jobId: string | null,
	options?: UseQueryOptions<ApiResponse<JobStatusResponse>>
) {
	return useQuery({
		queryKey: ['job', jobId, 'status'],
		queryFn: () => {
			if (!jobId) {
				throw new Error('Job ID is required')
			}
			return getJobStatus(jobId)
		},
		enabled: !!jobId,
		refetchInterval: (data) => {
			if (!data || data.data.status === 'completed' || data.data.status === 'failed') {
				return false
			}
			return API.POLLING_INTERVAL
		},
		...options
	})
}

/**
 * Hook for getting a download token
 */
export function useDownloadToken(
	jobId: string | null,
	options?: UseQueryOptions<ApiResponse<DownloadTokenResponse>>
) {
	return useQuery({
		queryKey: ['job', jobId, 'download-token'],
		queryFn: () => {
			if (!jobId) {
				throw new Error('Job ID is required')
			}
			return getDownloadToken(jobId)
		},
		enabled: !!jobId,
		staleTime: 5 * 60 * 1000, // 5 minutes
		...options
	})
}

/**
 * Hook for closing a session
 */
export function useCloseSession(
	options?: UseMutationOptions<ApiResponse<SessionCloseResponse>, Error, void, unknown>
) {
	return useMutation({
		mutationFn: closeSession,
		...options
	})
}

/**
 * High-level API client
 *
 * This module provides a clean interface for components to interact with the API.
 * It coordinates with sessionManager for session state and handles error processing.
 */

import { _apiClient } from './_apiClient'
import sessionManager from '@/lib/services/sessionManager'
import { debugLog, debugError } from '@/lib/utils/debug'
import { handleError } from '@/lib/utils/errorHandling'
import { withRetry, RETRY_STRATEGIES } from '@/lib/utils/retry'

import type {
	SessionInitResponse,
	UploadResponse,
	ConvertResponse,
	JobStatusResponse,
	DownloadTokenResponse,
	SessionCloseResponse,
	FormatsResponse
} from '@/lib/types/api'
import { apiConfig } from './config'

// Define the extended client type
interface ExtendedClient {
	initSession(forceNew?: boolean): Promise<SessionInitResponse>
	ensureSession(): Promise<boolean>
	uploadFile(file: File, fileJobId?: string): Promise<UploadResponse>
	convertFile(jobId: string, targetFormat: string, sourceFormat?: string): Promise<ConvertResponse>
	startConversion(file: File, targetFormat: string): Promise<ConvertResponse & { job_id: string }>
	getConversionStatus(jobId: string): Promise<JobStatusResponse>
	getDownloadToken(jobId: string): Promise<DownloadTokenResponse>
	getDownloadUrl(token: string): string
	closeSession(): Promise<SessionCloseResponse>
	getSupportedFormats(): Promise<FormatsResponse>
	_apiClient?: typeof _apiClient
}

const RETRY_CONFIG = RETRY_STRATEGIES.API_REQUEST

const client: ExtendedClient = {
	initSession: async (forceNew = false): Promise<SessionInitResponse> => {
		return withRetry(async () => {
			const response = await _apiClient.initSession()
			if (!response) {
				throw new Error('Session initialization failed: No response from _apiClient.initSession')
			}
			return response
		}, RETRY_CONFIG)
	},

	ensureSession: async (): Promise<boolean> => {
		return withRetry(async () => {
			return await sessionManager.ensureSession()
		}, RETRY_CONFIG)
	},

	uploadFile: async (file: File, fileJobId?: string): Promise<UploadResponse> => {
		return withRetry(async () => {
			// Ensure session before making the request
			await sessionManager.ensureSession()
			return await _apiClient.uploadFile(file, fileJobId)
		}, RETRY_CONFIG)
	},

	convertFile: async (
		jobId: string,
		targetFormat: string,
		sourceFormat?: string
	): Promise<ConvertResponse> => {
		return withRetry(async () => {
			await sessionManager.ensureSession()
			return await _apiClient.convertFile(jobId, targetFormat, sourceFormat)
		}, RETRY_CONFIG)
	},

	startConversion: async (
		file: File,
		targetFormat: string
	): Promise<ConvertResponse & { job_id: string }> => {
		return withRetry(async () => {
			await sessionManager.ensureSession()
			return await _apiClient.startConversion(file, targetFormat)
		}, RETRY_CONFIG)
	},

	getDownloadToken: async (jobId: string): Promise<DownloadTokenResponse> => {
		return withRetry(async () => {
			await sessionManager.ensureSession()
			return await _apiClient.getDownloadToken(jobId)
		}, RETRY_CONFIG)
	},

	getConversionStatus: async (jobId: string): Promise<JobStatusResponse> => {
		return withRetry(async () => {
			await sessionManager.ensureSession()
			return await _apiClient.getJobStatus(jobId)
		}, RETRY_CONFIG)
	},

	getDownloadUrl: (token: string): string => {
		return _apiClient.getDownloadUrl(token)
	},

	closeSession: async (): Promise<SessionCloseResponse> => {
		return withRetry(async () => {
			await sessionManager.ensureSession()
			return await _apiClient.closeSession()
		}, RETRY_CONFIG)
	},

	getSupportedFormats: async (): Promise<FormatsResponse> => {
		return withRetry(async () => {
			const response = await _apiClient.makeRequest<FormatsResponse>(apiConfig.endpoints.formats, {
				method: 'GET'
			})
			return response
		}, RETRY_STRATEGIES.API_REQUEST)
	}
}

export default client

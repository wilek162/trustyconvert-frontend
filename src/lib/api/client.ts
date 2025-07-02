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
import type { SessionInitResponse } from '@/lib/types/api'

// Define standard response type if not available in types
interface StandardResponse {
	success: boolean
	data: any
}

/**
 * Check if a response contains a CSRF error
 */
function isCsrfError(response: any): boolean {
	return (
		response.data?.csrf_error === true ||
		response.data?.error_message?.includes('CSRF') ||
		response.data?.message?.includes('CSRF') ||
		response.data?.error?.includes('CSRF') ||
		false
	)
}

/**
 * Standardize API responses to a consistent format
 */
function standardizeResponse(data: any): StandardResponse {
	return {
		success: true,
		data
	}
}

/**
 * High-level API client
 */
const client = {
	/**
	 * Initialize a session with the API
	 * This is a wrapper around sessionManager.initSession for API consistency
	 */
	initSession: async (forceNew = false): Promise<SessionInitResponse | null> => {
		try {
			// Use sessionManager to initialize the session
			const success = await sessionManager.initSession(forceNew)
			
			if (success) {
				// If successful, we can assume the _apiClient.initSession was called
				// and returned a response, but we don't have access to it here.
				// For API compatibility, return a minimal response object
				return {} as SessionInitResponse
			}
			
			return null
		} catch (error) {
			throw handleError(error, {
				context: { action: 'initSession' }
			})
		}
	},

	/**
	 * Ensure a valid session exists, with minimal API calls
	 * This is a wrapper around sessionManager.ensureSession for API consistency
	 */
	ensureSession: async (): Promise<boolean> => {
		try {
			return await sessionManager.ensureSession()
		} catch (error) {
			debugError('Error in client.ensureSession:', error)
			return false
		}
	},

	/**
	 * Upload a file to the server
	 */
	uploadFile: async (file: File, fileJobId?: string): Promise<StandardResponse> => {
		try {
			// Check if we have a valid session
			if (!sessionManager.hasCsrfToken()) {
				// Only call ensureSession if we don't have a valid session
				debugLog('No valid session for upload - initializing session');
				await sessionManager.ensureSession();
			} else {
				debugLog('Using existing session for upload - no session API call needed');
			}

			// Make the API call
			const response = await _apiClient.uploadFile(file, fileJobId);

			// Handle CSRF errors by refreshing the token and retrying
			if (isCsrfError(response)) {
				// Try to refresh the CSRF token without creating a new session
				await sessionManager.initSession(true);
				const retryResponse = await _apiClient.uploadFile(file, fileJobId);
				return standardizeResponse(retryResponse.data);
			}

			return standardizeResponse(response.data);
		} catch (error) {
			throw handleError(error, {
				context: { action: 'uploadFile', fileSize: file.size }
			});
		}
	},

	/**
	 * Convert a file to a different format
	 */
	convertFile: async (
		jobId: string,
		targetFormat: string,
		sourceFormat?: string
	): Promise<StandardResponse> => {
		try {
			// Check if we have a valid session
			if (!sessionManager.hasCsrfToken()) {
				// Only call ensureSession if we don't have a valid session
				debugLog('No valid session for conversion - initializing session');
				await sessionManager.ensureSession();
			} else {
				debugLog('Using existing session for conversion - no session API call needed');
			}

			// Make the API call
			const response = await _apiClient.convertFile(jobId, targetFormat, sourceFormat);

			// Handle CSRF errors by refreshing the token and retrying
			if (isCsrfError(response)) {
				// Try to refresh the CSRF token without creating a new session
				await sessionManager.initSession(true);
				const retryResponse = await _apiClient.convertFile(jobId, targetFormat, sourceFormat);
				return standardizeResponse(retryResponse.data);
			}

			return standardizeResponse(response.data);
		} catch (error) {
			throw handleError(error, {
				context: { action: 'convertFile', jobId, targetFormat, sourceFormat }
			});
		}
	},

	/**
	 * Start a conversion directly from a file upload
	 */
	startConversion: async (file: File, targetFormat: string): Promise<StandardResponse> => {
		try {
			// Check if we have a valid session
			if (!sessionManager.hasCsrfToken()) {
				// Only call ensureSession if we don't have a valid session
				debugLog('No valid session for startConversion - initializing session');
				await sessionManager.ensureSession();
			} else {
				debugLog('Using existing session for startConversion - no session API call needed');
			}

			// Make the API call
			const response = await _apiClient.startConversion(file, targetFormat);

			// Handle CSRF errors by refreshing the token and retrying
			if (isCsrfError(response)) {
				// Try to refresh the CSRF token without creating a new session
				await sessionManager.initSession(true);
				const retryResponse = await _apiClient.startConversion(file, targetFormat);
				return standardizeResponse(retryResponse.data);
			}

			return standardizeResponse(response.data);
		} catch (error) {
			throw handleError(error, {
				context: { action: 'startConversion', fileSize: file.size, targetFormat }
			});
		}
	},

	/**
	 * Get a download token for a converted file
	 */
	getDownloadToken: async (jobId: string): Promise<StandardResponse> => {
		try {
			// Check if we have a valid session
			if (!sessionManager.hasCsrfToken()) {
				// Only call ensureSession if we don't have a valid session
				debugLog('No valid session for download token - initializing session');
				await sessionManager.ensureSession();
			} else {
				debugLog('Using existing session for download token - no session API call needed');
			}

			// Make the API call
			const response = await _apiClient.getDownloadToken(jobId);

			// Handle CSRF errors by refreshing the token and retrying
			if (isCsrfError(response)) {
				// Try to refresh the CSRF token without creating a new session
				await sessionManager.initSession(true);
				const retryResponse = await _apiClient.getDownloadToken(jobId);
				return standardizeResponse(retryResponse.data);
			}

			return standardizeResponse(response.data);
		} catch (error) {
			throw handleError(error, {
				context: { action: 'getDownloadToken', jobId }
			});
		}
	}
}

export default client

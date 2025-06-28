/**
 * API Type definitions for TrustyConvert API responses
 * These types provide a consistent interface for all API communication
 */

/**
 * Common error fields that can be present in any API response
 */
export interface ApiErrorInfo {
	error?: string
	error_message?: string
	message?: string
	validation_errors?: Record<string, string>
	field_errors?: Record<string, string>
	session_expired?: boolean
	csrf_error?: boolean
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
	success: boolean
	data: T & ApiErrorInfo
	correlation_id?: string
}

/**
 * Session initialization response
 */
export interface SessionInitResponse {
	id: string
	csrf_token: string
	expires_at: string
}

/**
 * Job status values
 */
export type JobStatus = 'pending' | 'uploaded' | 'queued' | 'processing' | 'completed' | 'failed'

/**
 * File upload response
 */
export interface UploadResponse {
	job_id: string
	status: JobStatus
	original_filename?: string
	file_size?: number
	mime_type?: string
}

/**
 * Job status response
 */
export interface JobStatusResponse {
	job_id: string
	status: JobStatus
	progress?: number
	error_message?: string
	started_at?: string
	completed_at?: string
	estimated_time_remaining?: number
	current_step?: string
}

/**
 * Download token response
 */
export interface DownloadTokenResponse {
	download_token: string
	expires_at: string
}

/**
 * Convert file response
 */
export interface ConvertResponse {
	job_id: string
	status: JobStatus
}

/**
 * Session close response
 */
export interface SessionCloseResponse {
	message: string
	session_id?: string
}

/**
 * Supported conversion format
 */
export interface ConversionFormat {
	id: string
	name: string
	description?: string
	inputFormats: string[]
	outputFormats: string[]
	icon?: string
}

/**
 * Formats listing response
 */
export interface FormatsResponse {
	formats: ConversionFormat[]
}

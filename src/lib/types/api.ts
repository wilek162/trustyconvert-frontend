/**
 * API Type Definitions
 * 
 * Centralized type definitions for all API-related functionality.
 * This file is organized into sections by domain (Common, Session, Conversion, etc.)
 */

// ==========================================
// Common API Types
// ==========================================

/**
 * Generic API response wrapper
 * All API responses follow this structure
 */
export interface ApiResponse<T = any> {
	success: boolean
	data: T
	correlation_id?: string
	message?: string
}

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
	error_type?: string
}

/**
 * Job status values used across the API
 */
export type JobStatus = 
	| 'idle'
	| 'pending'
	| 'uploading' 
	| 'uploaded' 
	| 'queued'
	| 'processing' 
	| 'completed' 
	| 'failed'

/**
 * Conversion status (client-side representation of JobStatus)
 */
export type ConversionStatus = 
	| 'idle'
	| 'pending'
	| 'uploading'
	| 'queued'
	| 'processing'
	| 'completed'
	| 'failed'

/**
 * Progress information for uploads/downloads
 */
export interface ProgressInfo {
	loaded: number
	total: number
	percent: number
}

// ==========================================
// Session Management
// ==========================================

/**
 * Session initialization response
 */
export interface SessionInitResponse {
	id: string
	csrf_token: string
	expires_at: string
}

/**
 * Session information
 */
export interface SessionInfo {
	session_id: string
	expires_at: string
	created_at: string
}

/**
 * Session close response
 */
export interface SessionCloseResponse {
	message: string
	session_id?: string
}

// ==========================================
// File Upload
// ==========================================

/**
 * File upload response
 */
export interface UploadResponse {
	job_id: string
	status: JobStatus
	original_filename?: string
	filename?: string // Alias for original_filename for backward compatibility
	file_size?: number
	mime_type?: string
	upload_id?: string
}

// ==========================================
// Conversion
// ==========================================

/**
 * Convert file response
 */
export interface ConvertResponse {
	job_id: string
	status: JobStatus
	message?: string
}

/**
 * Conversion request parameters
 */
export interface ConversionRequest {
	job_id: string
	target_format: string
	options?: Record<string, unknown>
}

/**
 * Job status response
 */
export interface JobStatusResponse {
	job_id: string
	status: JobStatus
	progress?: number
	error_message?: string
	error_type?: string
	started_at?: string
	created_at?: string
	updated_at?: string
	completed_at?: string
	failed_at?: string
	estimated_time_remaining?: number
	current_step?: string
	original_filename?: string
	converted_path?: string | null
	output_size?: number | null
	conversion_time?: number | null
	download_token?: string | null
	filename?: string // Alias for original_filename for backward compatibility
	file_size?: number // Alias for output_size for backward compatibility
	download_url?: string // Constructed URL for convenience
}

/**
 * Conversion options
 */
export interface ConversionOptions {
	quality?: number
	password?: string
	preserveMetadata?: boolean
	pageRange?: string
	customOptions?: Record<string, any>
}

/**
 * Conversion result
 */
export interface ConversionResult {
	jobId: string
	resultUrl: string
	downloadToken?: string
	filename: string
	fileSize?: number
	conversionTime?: number
	success: boolean
	error?: string
}

// ==========================================
// Download
// ==========================================

/**
 * Download token response
 */
export interface DownloadTokenResponse {
	download_token: string
	expires_at: string
	expires_in?: number
	url?: string
}

/**
 * Download info response
 */
export interface DownloadInfoResponse {
	filename: string
	file_size: number
	mime_type: string
}

/**
 * Download options
 */
export interface DownloadOptions {
	onProgress?: (progress: ProgressInfo) => void
	signal?: AbortSignal
}

// ==========================================
// Formats
// ==========================================

/**
 * Format information
 */
export interface FormatInfo {
	code: string
	name: string
	extension: string
	mimeType: string
	mime_type?: string // For API compatibility
	category?: string
	description?: string
	compatibleOutputs: string[]
	compatible_outputs?: string[] // For API compatibility
	isInput: boolean
	is_input?: boolean // For API compatibility
	isOutput: boolean
	is_output?: boolean // For API compatibility
	icon?: string
}

/**
 * Formats listing response
 */
export interface FormatsResponse {
	formats: FormatInfo[]
	success?: boolean
	message?: string
}

/**
 * Conversion format (higher-level abstraction)
 */
export interface ConversionFormat {
	id: string
	name: string
	description?: string
	inputFormats: string[]
	outputFormats: string[]
	icon?: string
}

// ==========================================
// API Client Interface
// ==========================================

/**
 * API client interface
 * Defines the methods that should be implemented by any API client
 */
export interface ApiClientInterface {
	initSession(): Promise<ApiResponse<SessionInitResponse>>
	uploadFile(file: File, jobId?: string): Promise<ApiResponse<UploadResponse>>
	convertFile(jobId: string, targetFormat: string, sourceFormat?: string): Promise<ApiResponse<ConvertResponse>>
	startConversion(file: File, targetFormat: string): Promise<ApiResponse<ConvertResponse>>
	getConversionStatus(jobId: string): Promise<ApiResponse<JobStatusResponse>>
	getDownloadToken(jobId: string): Promise<ApiResponse<DownloadTokenResponse>>
	closeSession(): Promise<ApiResponse<SessionCloseResponse>>
	getSupportedFormats(): Promise<ApiResponse<FormatsResponse>>
	getDownloadUrl(downloadToken: string): string
}

// ==========================================
// Callback Types
// ==========================================

export type UploadProgressCallback = (progress: number) => void
export type ErrorCallback = (error: Error) => void

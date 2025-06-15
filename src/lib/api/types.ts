/**
 * API Type Definitions
 *
 * Contains type definitions for API requests and responses.
 */

/**
 * Supported file conversion formats
 */
export type ConversionFormat =
	// Document formats
	| 'pdf'
	| 'docx'
	| 'doc'
	| 'rtf'
	| 'txt'
	| 'odt'
	// Image formats
	| 'jpg'
	| 'jpeg'
	| 'png'
	| 'webp'
	| 'gif'
	| 'tiff'
	| 'bmp'
	| 'svg'
	// Audio formats
	| 'mp3'
	| 'wav'
	| 'ogg'
	| 'flac'
	| 'aac'
	| 'm4a'
	// Video formats
	| 'mp4'
	| 'webm'
	| 'avi'
	| 'mov'
	| 'mkv'
	// Archive formats
	| 'zip'
	| 'tar'
	| 'gz'
	| '7z'
	| 'rar'
	// Presentation formats
	| 'pptx'
	| 'ppt'
	| 'odp'
	// Spreadsheet formats
	| 'xlsx'
	| 'xls'
	| 'csv'
	| 'ods'

/**
 * Conversion job status
 */
export type ConversionStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed'

/**
 * Conversion job response
 */
export interface ConversionJobResponse {
	job_id: string
	status: ConversionStatus
	progress?: number
	download_url?: string | null
	filename?: string | null
	file_size?: number | null
	error?: string | null
	message?: string
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
 * Upload response
 */
export interface UploadResponse {
	job_id: string
	filename: string
	file_size: number
	mime_type: string
	upload_id: string
}

/**
 * Conversion request
 */
export interface ConversionRequest {
	job_id: string
	target_format: ConversionFormat
	options?: Record<string, unknown>
}

/**
 * Download token response
 */
export interface DownloadTokenResponse {
	download_token: string
	expires_in: number
	url: string
}

/**
 * Supported formats response
 */
export interface SupportedFormatsResponse {
	input_formats: Array<{
		format: string
		extensions: string[]
		mime_types: string[]
		name: string
	}>
	output_formats: Array<{
		format: string
		extensions: string[]
		mime_types: string[]
		name: string
	}>
	conversion_matrix: Record<string, string[]>
}

export type TaskStatus = {
	task_id: string
	file_id: string
	status: 'idle' | 'uploading' | 'processing' | 'completed' | 'failed'
	progress: number
	filename?: string
	error?: string
	error_details?: Record<string, unknown>
	download_url?: string
	created_at: string
	updated_at: string
}

export type ApiResponse<T> = {
	data: T
	error?: string
}

export type ConversionResponse = {
	task_id: string
	file_id: string
	status: TaskStatus['status']
}

export interface APIErrorResponse {
	code: string
	message: string
	details?: Record<string, unknown>
}

export interface APIResponse<T> {
	data: T
	meta?: {
		page?: number
		total?: number
		limit?: number
	}
}

export type UploadProgressCallback = (progress: number) => void
export type TaskStatusCallback = (status: TaskStatus) => void
export type ErrorCallback = (error: Error) => void

/**
 * Conversion-related type definitions
 */

export type ConversionStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed'

export interface ConversionTask {
	taskId: string
	status: ConversionStatus
	progress: number
	error?: string
	downloadUrl?: string
	fileName?: string
	fileSize?: number
}

export interface ConversionFormat {
	id: string
	name: string
	inputFormats: string[]
	outputFormats: string[]
	description?: string
}

export interface DownloadProgress {
	loaded: number
	total: number
	startTime: number
	estimatedTime: number
	speed: number
}

export interface ConversionOptions {
	onComplete?: (taskId: string) => void
	onError?: (error: string) => void
	onProgress?: (progress: number) => void
	pollingConfig?: {
		initialInterval: number
		maxInterval: number
		backoffFactor: number
		maxRetries: number
	}
}

export interface DownloadOptions {
	onComplete?: () => void
	onError?: (error: string) => void
	onProgress?: (progress: DownloadProgress) => void
}

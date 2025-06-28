/**
 * Re-export types from API
 */
export * from './api'

/**
 * Define common types used across the application
 */

/**
 * Status of a file conversion job
 */
export type ConversionStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'failed'

/**
 * File conversion result
 */
export interface ConversionResult {
	success: boolean
	downloadUrl?: string
	error?: string
}

/**
 * Supported file format
 */
export interface FileFormat {
	id: string
	name: string
	extension: string
	mimeType: string
}

/**
 * Conversion format
 */
export interface ConversionFormat {
	id: string
	name: string
	description?: string
	inputFormats: string[]
	outputFormats: string[]
	icon?: string
}

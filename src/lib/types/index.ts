/**
 * Centralized type exports
 * 
 * This file exports all types to provide a single import point.
 */

// Export all types from the API types file
export * from './api'

/**
 * Additional types used across the application
 * These are not directly related to API communication
 */

/**
 * Supported file format (simplified version)
 */
export interface FileFormat {
	id: string
	name: string
	extension: string
	mimeType: string
}

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

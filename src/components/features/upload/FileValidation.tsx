import { FILE_UPLOAD } from '@/lib/config/constants'
import {
	validateFileSize,
	validateFileType,
	validateFileExtension,
	getFileExtension
} from '@/lib/utils/files'

/**
 * File validation interface
 */
export interface FileValidationResult {
	isValid: boolean
	error?: string
	details?: {
		sizeValid: boolean
		typeValid: boolean
		extensionValid: boolean
	}
}

/**
 * File validation options
 */
export interface FileValidationOptions {
	maxSize?: number
	allowedTypes?: string[]
	allowedExtensions?: string[]
}

/**
 * Validate a file based on size, type, and extension
 * @param file File to validate
 * @param options Validation options
 * @returns Validation result with details
 */
export function validateFile(
	file: File,
	options: FileValidationOptions = {}
): FileValidationResult {
	const {
		maxSize = FILE_UPLOAD.MAX_SIZE,
		allowedTypes = Object.values(FILE_UPLOAD.MIME_TYPES).flat(),
		allowedExtensions = Object.values(FILE_UPLOAD.SUPPORTED_FORMATS).flat()
	} = options

	// Validate size
	const sizeValid = validateFileSize(file, maxSize)

	// Validate type
	const typeValid = validateFileType(file, allowedTypes)

	// Validate extension
	const extensionValid = validateFileExtension(file.name, allowedExtensions)

	const isValid = sizeValid && (typeValid || extensionValid)

	let error: string | undefined

	if (!sizeValid) {
		error = `File is too large. Maximum size is ${Math.round(maxSize / (1024 * 1024))} MB.`
	} else if (!typeValid && !extensionValid) {
		error = `File type not supported. Please upload one of these formats: ${allowedExtensions.join(', ')}.`
	}

	return {
		isValid,
		error,
		details: {
			sizeValid,
			typeValid,
			extensionValid
		}
	}
}

/**
 * Check if a file can be converted to a specific format
 * @param file File to check
 * @param targetFormat Target format for conversion
 * @returns Whether conversion is possible
 */
export function canConvertTo(file: File, targetFormat: string): boolean {
	const extension = getFileExtension(file.name).toLowerCase()

	// Same format - no conversion needed
	if (extension === targetFormat.toLowerCase()) {
		return true
	}

	// Get category for source file
	const sourceCategory = getFileCategory(file)

	// Get category for target format
	const targetCategory = getFormatCategory(targetFormat)

	// Cross-category conversions only allowed for specific scenarios
	if (sourceCategory !== targetCategory) {
		// Only allow document->image, image->document for specific formats
		if (sourceCategory === 'DOCUMENT' && targetCategory === 'IMAGE') {
			return ['pdf'].includes(extension) && ['jpg', 'png'].includes(targetFormat)
		}

		if (sourceCategory === 'IMAGE' && targetCategory === 'DOCUMENT') {
			return ['jpg', 'png', 'gif'].includes(extension) && ['pdf'].includes(targetFormat)
		}

		return false
	}

	return true
}

/**
 * Get available conversion formats for a file
 * @param file Input file
 * @returns Array of possible output formats
 */
export function getAvailableFormats(file: File): string[] {
	const extension = getFileExtension(file.name).toLowerCase()
	const category = getFileCategory(file)

	if (!category) {
		return []
	}

	// Get all formats in the same category
	const availableFormats = FILE_UPLOAD.SUPPORTED_FORMATS[category].filter(
		(format) => format !== extension
	)

	// Add special cross-category conversions
	if (category === 'DOCUMENT' && extension === 'pdf') {
		availableFormats.push('jpg', 'png')
	} else if (category === 'IMAGE' && ['jpg', 'png', 'gif'].includes(extension)) {
		availableFormats.push('pdf')
	}

	return availableFormats
}

/**
 * Get file category (DOCUMENT, IMAGE, etc)
 * @param file File to categorize
 * @returns Category name or undefined
 */
export function getFileCategory(
	file: File
): keyof typeof FILE_UPLOAD.SUPPORTED_FORMATS | undefined {
	const extension = getFileExtension(file.name).toLowerCase()

	// Check by MIME type first
	for (const [category, mimeTypes] of Object.entries(FILE_UPLOAD.MIME_TYPES)) {
		if (mimeTypes.includes(file.type)) {
			return category as keyof typeof FILE_UPLOAD.SUPPORTED_FORMATS
		}
	}

	// Fall back to extension check
	for (const [category, extensions] of Object.entries(FILE_UPLOAD.SUPPORTED_FORMATS)) {
		if (extensions.includes(extension)) {
			return category as keyof typeof FILE_UPLOAD.SUPPORTED_FORMATS
		}
	}

	return undefined
}

/**
 * Get category for a format
 * @param format Format extension (pdf, jpg, etc)
 * @returns Category name or undefined
 */
export function getFormatCategory(
	format: string
): keyof typeof FILE_UPLOAD.SUPPORTED_FORMATS | undefined {
	const normalizedFormat = format.toLowerCase().replace('.', '')

	for (const [category, extensions] of Object.entries(FILE_UPLOAD.SUPPORTED_FORMATS)) {
		if (extensions.includes(normalizedFormat)) {
			return category as keyof typeof FILE_UPLOAD.SUPPORTED_FORMATS
		}
	}

	return undefined
}

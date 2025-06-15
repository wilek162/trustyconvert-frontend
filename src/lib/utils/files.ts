/**
 * File utility functions for handling and processing files
 */

import { FILE_UPLOAD } from '@/lib/config/constants'

/**
 * File information object
 */
export interface FileInfo {
	name: string
	extension: string
	size: string
	sizeInBytes: number
	type: string
	lastModified?: string
}

/**
 * Extract file information from a File object
 * @param file File object to extract info from
 * @returns Object with file information
 */
export function getFileInfo(file: File): FileInfo {
	const extension = getFileExtension(file.name)

	return {
		name: file.name,
		extension,
		size: formatFileSize(file.size),
		sizeInBytes: file.size,
		type: file.type,
		lastModified: file.lastModified ? new Date(file.lastModified).toISOString() : undefined
	}
}

/**
 * Format file size to human readable string
 * @param bytes File size in bytes
 * @param decimals Number of decimal places
 * @returns Formatted file size
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
	if (bytes === 0) return '0 Bytes'

	const k = 1024
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))

	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

/**
 * Get file extension from file name
 * @param fileName The file name
 * @returns The file extension (without the dot)
 */
export function getFileExtension(fileName: string): string {
	return fileName.slice(((fileName.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase()
}

/**
 * Get MIME type from file extension
 * @param extension File extension
 * @returns MIME type
 */
export function getMimeType(extension: string): string {
	const mimeTypes: Record<string, string> = {
		// Document formats
		pdf: 'application/pdf',
		doc: 'application/msword',
		docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		rtf: 'application/rtf',
		odt: 'application/vnd.oasis.opendocument.text',

		// Spreadsheet formats
		xls: 'application/vnd.ms-excel',
		xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		csv: 'text/csv',

		// Presentation formats
		ppt: 'application/vnd.ms-powerpoint',
		pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

		// Image formats
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		png: 'image/png',
		gif: 'image/gif',
		svg: 'image/svg+xml',
		webp: 'image/webp',

		// Text formats
		txt: 'text/plain',

		// Data formats
		json: 'application/json',
		xml: 'application/xml',

		// Archive formats
		zip: 'application/zip',
		'7z': 'application/x-7z-compressed',
		rar: 'application/x-rar-compressed',
		tar: 'application/x-tar',
		gz: 'application/gzip'
	}

	return mimeTypes[extension.toLowerCase()] || 'application/octet-stream'
}

/**
 * Validate if a file size is within limit
 * @param file File to check
 * @param maxSize Maximum allowed size in bytes
 * @returns Boolean indicating if file is within size limit
 */
export function validateFileSize(file: File, maxSize: number = FILE_UPLOAD.MAX_SIZE): boolean {
	return file.size <= maxSize
}

/**
 * Validate if a file type is allowed
 * @param file File to check
 * @param allowedTypes Array of allowed MIME types
 * @returns Boolean indicating if file type is allowed
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
	return allowedTypes.includes(file.type)
}

/**
 * Validate if a file extension is allowed
 * @param fileName File name to check
 * @param allowedExtensions Array of allowed extensions
 * @returns Boolean indicating if extension is allowed
 */
export function validateFileExtension(fileName: string, allowedExtensions: string[]): boolean {
	const extension = getFileExtension(fileName)
	return allowedExtensions.map((ext) => ext.toLowerCase().replace('.', '')).includes(extension)
}

/**
 * Create object URL from file
 * @param file File to create URL for
 * @returns Object URL
 */
export function createObjectURL(file: File | Blob): string {
	return URL.createObjectURL(file)
}

/**
 * Revoke object URL to prevent memory leaks
 * @param url Object URL to revoke
 */
export function revokeObjectURL(url: string): void {
	URL.revokeObjectURL(url)
}

/**
 * Check if a file can be previewed in browser
 * @param file File to check
 * @returns Boolean indicating if file can be previewed
 */
export function canPreviewFile(file: File): boolean {
	const extension = getFileExtension(file.name).toLowerCase()
	const previewableTypes = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'svg']

	return previewableTypes.includes(extension)
}

/**
 * Get preview type for file
 * @param file File to get preview type for
 * @returns Preview type ('image', 'pdf', or null)
 */
export function getPreviewType(file: File): 'image' | 'pdf' | null {
	const extension = getFileExtension(file.name).toLowerCase()

	if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) {
		return 'image'
	}

	if (extension === 'pdf') {
		return 'pdf'
	}

	return null
}

/**
 * Check if a file is an image
 * @param file File to check
 * @returns Whether the file is an image
 */
export function isImage(file: File): boolean {
	return file.type.startsWith('image/')
}

/**
 * Check if a file is a document
 * @param file File to check
 * @returns Whether the file is a document
 */
export function isDocument(file: File): boolean {
	const docTypes = [
		'application/pdf',
		'application/msword',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'application/rtf',
		'application/vnd.oasis.opendocument.text',
		'text/plain'
	]

	return docTypes.includes(file.type)
}

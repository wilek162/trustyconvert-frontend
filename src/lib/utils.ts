import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge class names with Tailwind CSS classes
 * This utility combines clsx and tailwind-merge to handle conditional
 * class names and resolve Tailwind CSS conflicts
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

/**
 * Format file size to human readable string
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 Bytes'
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
	const i = Math.floor(Math.log(bytes) / Math.log(1024))
	return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`
}

/**
 * Get file extension from file name
 */
export function getFileExtension(fileName: string): string {
	return fileName.slice(((fileName.lastIndexOf('.') - 1) >>> 0) + 2)
}

/**
 * Get MIME type from file extension
 */
export function getMimeType(extension: string): string {
	const mimeTypes: Record<string, string> = {
		pdf: 'application/pdf',
		doc: 'application/msword',
		docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		xls: 'application/vnd.ms-excel',
		xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		ppt: 'application/vnd.ms-powerpoint',
		pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		png: 'image/png',
		gif: 'image/gif',
		svg: 'image/svg+xml',
		txt: 'text/plain',
		csv: 'text/csv',
		json: 'application/json',
		xml: 'application/xml',
		zip: 'application/zip',
		'7z': 'application/x-7z-compressed',
		rar: 'application/x-rar-compressed',
		tar: 'application/x-tar',
		gz: 'application/gzip'
	}

	return mimeTypes[extension.toLowerCase()] || 'application/octet-stream'
}

/**
 * Validate file size
 */
export function validateFileSize(file: File, maxSize: number): boolean {
	return file.size <= maxSize
}

/**
 * Validate file type
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
	return allowedTypes.includes(file.type)
}

/**
 * Generate a random string
 */
export function generateId(length = 8): string {
	return Math.random()
		.toString(36)
		.substring(2, length + 2)
}

/**
 * Delay execution
 */
export function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
	fn: () => Promise<T>,
	maxAttempts = 3,
	baseDelay = 1000
): Promise<T> {
	let lastError: Error | null = null

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		try {
			return await fn()
		} catch (error) {
			lastError = error as Error
			if (attempt < maxAttempts - 1) {
				await delay(baseDelay * Math.pow(2, attempt))
				continue
			}
		}
	}

	throw lastError
}

/**
 * Truncates a string if it exceeds the maximum length
 */
export function truncateString(str: string, maxLength: number): string {
	if (str.length <= maxLength) return str
	return str.slice(0, maxLength) + '...'
}

/**
 * Generates a random string of specified length
 */
export function generateRandomString(length: number): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	let result = ''
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length))
	}
	return result
}

/**
 * Debounces a function
 */
export function debounce<T extends (...args: any[]) => any>(
	fn: T,
	delay: number
): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout>
	return function (...args: Parameters<T>) {
		clearTimeout(timeoutId)
		timeoutId = setTimeout(() => fn(...args), delay)
	}
}

/**
 * Checks if a file type is supported
 */
export function isSupportedFileType(fileType: string, supportedTypes: string[]): boolean {
	return supportedTypes.includes(fileType)
}

/**
 * Checks if the device is mobile
 */
export function isMobileDevice(): boolean {
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

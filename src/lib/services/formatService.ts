/**
 * Format Service
 *
 * Centralized service for managing format data across the application.
 * Provides functions for fetching, caching, and querying format information.
 */

import client from '@/lib/api/client'
import { debugLog } from '@/lib/utils/debug'
import type { FormatInfo, ConversionFormat } from '@/lib/types/api'

// Mock data for static builds or when API is unavailable
const MOCK_FORMATS: ConversionFormat[] = [
	{
		id: 'pdf',
		name: 'PDF',
		description: 'Portable Document Format',
		inputFormats: [],
		outputFormats: ['docx', 'jpg', 'png', 'txt'],
		icon: '📄'
	},
	{
		id: 'docx',
		name: 'Word Document',
		description: 'Microsoft Word Document',
		inputFormats: [],
		outputFormats: ['pdf', 'txt', 'rtf'],
		icon: '📝'
	},
	{
		id: 'jpg',
		name: 'JPEG Image',
		description: 'Joint Photographic Experts Group image',
		inputFormats: [],
		outputFormats: ['png', 'webp', 'pdf'],
		icon: '🖼️'
	},
	{
		id: 'png',
		name: 'PNG Image',
		description: 'Portable Network Graphics',
		inputFormats: [],
		outputFormats: ['jpg', 'webp', 'pdf'],
		icon: '🖼️'
	},
	{
		id: 'webp',
		name: 'WebP Image',
		description: 'Web Picture format',
		inputFormats: [],
		outputFormats: ['jpg', 'png'],
		icon: '🖼️'
	},
	{
		id: 'txt',
		name: 'Text File',
		description: 'Plain text file',
		inputFormats: [],
		outputFormats: ['pdf', 'docx'],
		icon: '📝'
	},
	{
		id: 'rtf',
		name: 'Rich Text Format',
		description: 'Rich Text Format document',
		inputFormats: [],
		outputFormats: ['pdf', 'docx', 'txt'],
		icon: '📝'
	},
	{
		id: 'xlsx',
		name: 'Excel Spreadsheet',
		description: 'Microsoft Excel Spreadsheet',
		inputFormats: [],
		outputFormats: ['pdf', 'csv'],
		icon: '📊'
	},
	{
		id: 'csv',
		name: 'CSV File',
		description: 'Comma-Separated Values',
		inputFormats: [],
		outputFormats: ['xlsx', 'pdf'],
		icon: '📊'
	},
	{
		id: 'pptx',
		name: 'PowerPoint Presentation',
		description: 'Microsoft PowerPoint Presentation',
		inputFormats: [],
		outputFormats: ['pdf'],
		icon: '📊'
	}
]

// Format categories for organization
export const FORMAT_CATEGORIES = {
	document: {
		name: 'Documents',
		formats: ['pdf', 'docx', 'doc', 'txt', 'rtf', 'odt']
	},
	image: {
		name: 'Images',
		formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg']
	},
	spreadsheet: {
		name: 'Spreadsheets',
		formats: ['xlsx', 'xls', 'csv', 'ods']
	},
	presentation: {
		name: 'Presentations',
		formats: ['pptx', 'ppt', 'odp']
	}
}

// Cache for format data to avoid repeated API calls
let formatCache: ConversionFormat[] | null = null
let lastFetchTime = 0
const CACHE_TTL = 1000 * 60 * 5 // 5 minutes

/**
 * Try to load formats from the static JSON file
 * @returns Array of format objects or null if not available
 */
async function loadStaticFormats(): Promise<ConversionFormat[] | null> {
	// Only run in browser environment
	if (typeof window === 'undefined') {
		return null
	}

	try {
		// Try to fetch the static JSON file
		const response = await fetch('/data/formats.json')

		if (!response.ok) {
			return null
		}

		const data = await response.json()

		// Handle the new API response format
		if (
			data &&
			data.success &&
			data.data &&
			data.data.formats &&
			Array.isArray(data.data.formats)
		) {
			debugLog('Loaded formats from static JSON file', data.data.formats.length)
			return data.data.formats
		}
	} catch (error) {
		debugLog('Failed to load static formats JSON:', error)
	}

	return null
}

/**
 * Get all supported formats
 * @param forceRefresh Force a refresh of the cache
 * @param isStaticMode Whether we're in static build mode
 * @returns Array of format objects
 */
export async function getAllFormats(
	forceRefresh = false,
	isStaticMode = false
): Promise<ConversionFormat[]> {
	// In static mode, try to load from the static JSON file first
	if (isStaticMode) {
		try {
			// In Node.js environment during build, read the file directly
			if (typeof window === 'undefined') {
				try {
					// Try to dynamically import the fs module
					const fs = await import('fs')
					const path = await import('path')

					// Get the path to the static JSON file
					const dataPath = path.join(process.cwd(), 'public', 'data', 'formats.json')

					// Check if the file exists
					if (fs.existsSync(dataPath)) {
						const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))

						// Handle the new API response format
						if (data && data.success && data.data && data.data.formats) {
							return data.data.formats
						}
					}
				} catch (error) {
					console.warn('Failed to load static formats during build:', error)
				}
			}

			// Fall back to mock data
			return MOCK_FORMATS
		} catch (error) {
			console.warn('Error loading static formats in static mode:', error)
			return MOCK_FORMATS
		}
	}

	// Check if cache is valid
	const now = Date.now()
	if (!forceRefresh && formatCache && now - lastFetchTime < CACHE_TTL) {
		return formatCache
	}

	// First try to load from static JSON file
	const staticFormats = await loadStaticFormats()
	if (staticFormats) {
		formatCache = staticFormats
		lastFetchTime = now
		return staticFormats
	}

	try {
		// If static file not available, fetch from API
		const response = await client.getSupportedFormats()

		// Handle the new API response format
		if (response.success && response.data?.data?.formats) {
			formatCache = response.data.data.formats
			lastFetchTime = now
			return formatCache || []
		}
	} catch (error) {
		debugLog('Failed to fetch formats from API, using mock data:', error)
	}

	// Fall back to mock data if both static file and API call failed
	return MOCK_FORMATS
}

/**
 * Get format info by ID
 * @param formatId Format ID to look up
 * @param formats Optional array of formats to search in
 * @returns Format info or undefined if not found
 */
export function getFormatById(
	formatId: string,
	formats?: ConversionFormat[]
): ConversionFormat | undefined {
	const formatsToSearch = formats || formatCache || MOCK_FORMATS
	return formatsToSearch.find((format) => format.id === formatId)
}

/**
 * Get all possible source-target format combinations
 * @param formats Optional array of formats to use
 * @returns Array of source-target pairs
 */
export function getAllConversionPairs(
	formats?: ConversionFormat[]
): { source: string; target: string }[] {
	const formatsToUse = formats || formatCache || MOCK_FORMATS

	return formatsToUse.flatMap((format) =>
		format.outputFormats.map((targetFormat) => ({
			source: format.id,
			target: targetFormat
		}))
	)
}

/**
 * Get related conversions for a specific target format
 * @param targetFormat Target format ID
 * @param currentSourceFormat Current source format ID to exclude
 * @param limit Maximum number of related conversions to return
 * @param formats Optional array of formats to use
 * @returns Array of format objects that can convert to the target format
 */
export function getRelatedConversions(
	targetFormat: string,
	currentSourceFormat: string,
	limit = 4,
	formats?: ConversionFormat[]
): ConversionFormat[] {
	const formatsToUse = formats || formatCache || MOCK_FORMATS

	return formatsToUse
		.filter(
			(format) => format.id !== currentSourceFormat && format.outputFormats.includes(targetFormat)
		)
		.slice(0, limit)
}

/**
 * Get the category of a format
 * @param formatId Format ID to look up
 * @returns Category name or 'other' if not found
 */
export function getFormatCategory(formatId: string): string {
	for (const [category, data] of Object.entries(FORMAT_CATEGORIES)) {
		if (data.formats.includes(formatId)) {
			return category
		}
	}
	return 'other'
}

// Export format service as an object for consistency
const formatService = {
	getAllFormats,
	getFormatById,
	getAllConversionPairs,
	getRelatedConversions,
	getFormatCategory,
	FORMAT_CATEGORIES,
	MOCK_FORMATS
}

export default formatService

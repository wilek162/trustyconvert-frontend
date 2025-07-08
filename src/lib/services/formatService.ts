/**
 * Format Service
 *
 * Centralized service for managing format data across the application.
 * Provides functions for fetching, caching, and querying format information.
 */

import { debugLog, debugError } from '@/lib/utils/debug'
import type { FormatInfo, ConversionFormat } from '@/lib/types/api'

// Mock data for static builds or when static file is unavailable
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

// Mapping between JSON category IDs and our internal category IDs
const CATEGORY_MAPPING = {
	documents: 'document',
	images: 'image',
	spreadsheets: 'spreadsheet',
	presentations: 'presentation'
}

// Cache for format data to avoid repeated file loading
let formatCache: ConversionFormat[] | null = null

/**
 * Process the formats from the JSON file into our internal format structure
 * @param jsonData The raw data from the formats.json file
 * @returns Processed array of ConversionFormat objects
 */
function processJsonFormats(jsonData: any): ConversionFormat[] {
	try {
		console.log('Processing JSON formats data:', jsonData)

		if (!jsonData?.data?.formats || !Array.isArray(jsonData.data.formats)) {
			debugError('Invalid JSON format data structure:', jsonData)
			return MOCK_FORMATS
		}

		// Extract all individual formats from the category-based JSON structure
		const processedFormats: ConversionFormat[] = []

		// Process each category from the JSON
		jsonData.data.formats.forEach((category: any) => {
			console.log('Processing category:', category.id, 'with input formats:', category.inputFormats)

			// For each input format in this category
			if (!Array.isArray(category.inputFormats)) {
				debugError('Category has invalid inputFormats:', category)
				return
			}

			category.inputFormats.forEach((formatId: string) => {
				// Create a format object for each input format
				const format: ConversionFormat = {
					id: formatId,
					name: formatId.toUpperCase(),
					description: `${formatId.toUpperCase()} Format`,
					inputFormats: [],
					outputFormats: Array.isArray(category.outputFormats) ? category.outputFormats : [],
					icon: getCategoryIcon(CATEGORY_MAPPING[category.id] || 'other')
				}

				// Add to our processed formats array
				processedFormats.push(format)
			})
		})

		console.log('Processed formats:', processedFormats.length, 'formats')
		return processedFormats
	} catch (error) {
		debugError('Error processing JSON formats:', error)
		console.error('Error processing JSON formats:', error)
		return MOCK_FORMATS
	}
}

/**
 * Get an icon character for a category
 */
function getCategoryIcon(category: string): string {
	switch (category) {
		case 'document':
			return '📄'
		case 'image':
			return '🖼️'
		case 'spreadsheet':
			return '📊'
		case 'presentation':
			return '📊'
		default:
			return '📁'
	}
}

/**
 * Load formats from the static JSON file
 * @returns Array of format objects or null if not available
 */
async function loadStaticFormats(): Promise<ConversionFormat[] | null> {
	// Only run in browser environment
	if (typeof window === 'undefined') {
		console.log('Not in browser environment, skipping static formats load')
		return null
	}

	try {
		console.log('Attempting to load formats from static JSON file')

		// Try to fetch the static JSON file
		const response = await fetch('/data/formats.json')

		if (!response.ok) {
			debugError('Static formats file not available, status:', response.status)
			console.error('Static formats file not available, status:', response.status)
			return null
		}

		const data = await response.json()
		console.log('Loaded formats.json data:', data)

		// Process the JSON data into our format structure
		if (data && data.success) {
			const processedFormats = processJsonFormats(data)
			debugLog('Loaded and processed formats from static JSON file', processedFormats.length)
			console.log('Successfully processed formats:', processedFormats.length)
			return processedFormats
		} else {
			console.error('Invalid format data structure:', data)
		}
	} catch (error) {
		debugError('Failed to load static formats JSON:', error)
		console.error('Failed to load static formats JSON:', error)
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
	console.log('getAllFormats called, forceRefresh:', forceRefresh, 'isStaticMode:', isStaticMode)

	// If we already have cached formats and don't need to refresh, return them
	if (!forceRefresh && formatCache) {
		console.log('Returning cached formats:', formatCache.length)
		return formatCache
	}

	// In static mode (during build), try to load from the file system
	if (isStaticMode && typeof window === 'undefined') {
		console.log('Static mode detected, loading from file system')
		try {
			// Try to dynamically import the fs module
			const fs = await import('fs')
			const path = await import('path')

			// Get the path to the static JSON file
			const dataPath = path.join(process.cwd(), 'public', 'data', 'formats.json')
			console.log('Loading formats from path:', dataPath)

			// Check if the file exists
			if (fs.existsSync(dataPath)) {
				const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'))
				console.log('Loaded formats from file system:', data)

				// Process the JSON data
				if (data && data.success) {
					formatCache = processJsonFormats(data)
					return formatCache
				} else {
					console.error('Invalid format data structure in file system:', data)
				}
			} else {
				console.error('Formats file does not exist at path:', dataPath)
			}
		} catch (error) {
			console.warn('Failed to load static formats during build:', error)
		}

		// Fall back to mock data during build if file can't be loaded
		console.log('Using mock formats in static mode')
		return MOCK_FORMATS
	}

	// For client-side, load from static JSON file
	console.log('Attempting to load formats from static file')
	const staticFormats = await loadStaticFormats()
	if (staticFormats) {
		console.log('Successfully loaded formats from static file:', staticFormats.length)
		formatCache = staticFormats
		return staticFormats
	}

	// If all else fails, use mock data
	debugLog('Using mock format data as fallback')
	console.log('Using mock format data as fallback')
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

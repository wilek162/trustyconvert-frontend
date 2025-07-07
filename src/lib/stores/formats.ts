/**
 * Formats Store
 *
 * Manages supported file formats with API integration.
 * Provides access to input and output formats.
 */

import { atom, map } from 'nanostores'
import { createDerivedStore } from './storeUtils'
import type { FormatInfo } from '@/lib/types/api'

// Main formats store - array of format objects
export const formatsStore = atom<FormatInfo[]>([])

// Derived store for input formats only
export const inputFormatsStore = createDerivedStore(formatsStore, (formats) =>
	formats.filter((format: FormatInfo) => format.inputFormats && format.inputFormats.length > 0)
)

// Derived store for output formats only
export const outputFormatsStore = createDerivedStore(formatsStore, (formats) =>
	formats.filter((format: FormatInfo) => format.outputFormats && format.outputFormats.length > 0)
)

// Loading state store
export const formatsLoadingStore = map({
	loading: false,
	error: null as string | null
})

/**
 * Load formats into the store
 * @param formats Array of format objects to load
 */
export function loadFormats(formats: FormatInfo[]) {
	formatsLoadingStore.set({ loading: true, error: null })

	try {
		// Process formats if needed
		const processedFormats = formats.map((format) => {
			// Ensure backward compatibility by mapping new fields to old fields if needed
			return {
				...format,
				// If code is not defined, use id
				code: format.code || format.id,
				// If compatibleOutputs is not defined, use outputFormats
				compatibleOutputs: format.compatibleOutputs || format.outputFormats,
				// If isInput is not defined, infer from inputFormats
				isInput:
					format.isInput !== undefined
						? format.isInput
						: format.inputFormats && format.inputFormats.length > 0,
				// If isOutput is not defined, infer from outputFormats
				isOutput:
					format.isOutput !== undefined
						? format.isOutput
						: format.outputFormats && format.outputFormats.length > 0
			}
		})

		formatsStore.set(processedFormats)
		formatsLoadingStore.set({ loading: false, error: null })
	} catch (error) {
		console.error('Error loading formats:', error)
		formatsLoadingStore.set({
			loading: false,
			error: error instanceof Error ? error.message : 'Unknown error loading formats'
		})
	}
}

/**
 * Clear the formats store
 */
export function clearFormats() {
	formatsStore.set([])
}

/**
 * Get format information by code
 * @param formatCode Format code to look up
 * @returns Format information or undefined if not found
 */
export function getFormatInfo(formatCode: string): FormatInfo | undefined {
	const formats = formatsStore.get()
	return formats.find((f: FormatInfo) => f.id === formatCode || f.code === formatCode)
}

// Export formats service as an object for consistency
export const formatsService = {
	loadFormats,
	clearFormats,
	getFormatInfo
}

export default formatsService

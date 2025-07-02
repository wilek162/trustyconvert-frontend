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
export const inputFormatsStore = createDerivedStore(
  formatsStore,
  (formats) => formats.filter((format: FormatInfo) => format.isInput)
)

// Derived store for output formats only
export const outputFormatsStore = createDerivedStore(
  formatsStore,
  (formats) => formats.filter((format: FormatInfo) => format.isOutput)
)

// Store for format loading state
export const formatsLoadingStore = map({
  loading: false,
  error: null as string | null
})

/**
 * Load formats into the store
 * @param formats Array of format objects from API
 */
export function loadFormats(formats: FormatInfo[]) {
  // Update formats store with new data
  formatsStore.set(formats)
  
  // Update loading state
  formatsLoadingStore.set({
    loading: false,
    error: null
  })
}

/**
 * Set loading state
 * @param isLoading Whether formats are being loaded
 */
export function setFormatsLoading(isLoading: boolean) {
  formatsLoadingStore.setKey('loading', isLoading)
}

/**
 * Set error state
 * @param error Error message
 */
export function setFormatsError(error: string | null) {
  formatsLoadingStore.set({
    loading: false,
    error
  })
}

/**
 * Get formats compatible with a specific input format
 * @param inputFormat Input format code
 * @returns Array of compatible output format codes
 */
export function getCompatibleFormats(inputFormat: string): string[] {
  const formats = formatsStore.get()
  const format = formats.find((f: FormatInfo) => f.code === inputFormat)
  return format?.compatibleOutputs || []
}

/**
 * Check if a conversion between formats is supported
 * @param inputFormat Input format code
 * @param outputFormat Output format code
 * @returns Boolean indicating if conversion is supported
 */
export function isConversionSupported(inputFormat: string, outputFormat: string): boolean {
  const compatibleFormats = getCompatibleFormats(inputFormat)
  return compatibleFormats.includes(outputFormat)
}

/**
 * Get format information by code
 * @param formatCode Format code to look up
 * @returns Format information or undefined if not found
 */
export function getFormatInfo(formatCode: string): FormatInfo | undefined {
  const formats = formatsStore.get()
  return formats.find((f: FormatInfo) => f.code === formatCode)
}

// Export formats service as an object for consistency
export const formatsService = {
  loadFormats,
  setFormatsLoading,
  setFormatsError,
  getCompatibleFormats,
  isConversionSupported,
  getFormatInfo
}

export default formatsService 
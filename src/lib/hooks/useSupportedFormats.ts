import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { debugLog, debugError } from '@/lib/utils/debug'
import {
	formatsStore,
	inputFormatsStore,
	outputFormatsStore,
	loadFormats,
	formatsLoadingStore
} from '@/lib/stores/formats'
import { useStore } from './useStore'
import type { FormatInfo } from '@/lib/types/api'
import { getAllFormats } from '@/lib/services/formatService'

/**
 * Hook to fetch and manage supported file formats
 */
export function useSupportedFormats() {
	// Get formats from store
	const formats = useStore(formatsStore)
	const inputFormats = useStore(inputFormatsStore)
	const outputFormats = useStore(outputFormatsStore)
	const loadingState = useStore(formatsLoadingStore)

	// Use React Query to fetch formats from static file
	const query = useQuery({
		queryKey: ['supported-formats'],
		queryFn: async () => {
			try {
				debugLog('Loading supported formats from static file')
				const formats = await getAllFormats()

				// Update the formats store
				loadFormats(formats)

				return formats
			} catch (error) {
				debugError('Error loading formats:', error)
				throw error
			}
		},
		staleTime: 1000 * 60 * 60, // 1 hour
		refetchOnWindowFocus: false
	})

	// Load formats from store on mount if not already loaded
	useEffect(() => {
		if (formats.length === 0 && !loadingState.loading && !query.isLoading && !query.isError) {
			query.refetch()
		}
	}, [formats.length, loadingState.loading, query])

	return {
		formats,
		inputFormats,
		outputFormats,
		isLoading: loadingState.loading || query.isLoading,
		error: loadingState.error || (query.error instanceof Error ? query.error.message : query.error),
		refetch: query.refetch
	}
}

/**
 * Hook to get output formats compatible with a specific input format
 * @param inputFormat Input format code (e.g., 'pdf')
 */
export function useCompatibleFormats(inputFormat: string | null) {
	const { formats } = useSupportedFormats()

	if (!inputFormat || formats.length === 0) {
		return []
	}

	// Find the input format object
	const format = formats.find((f) => f.id === inputFormat)

	// Return compatible output formats
	return format?.outputFormats || []
}

/**
 * Check if a conversion between formats is supported
 * @param inputFormat Input format code
 * @param outputFormat Output format code
 * @returns Boolean indicating if conversion is supported
 */
export function isConversionSupported(inputFormat: string, outputFormat: string): boolean {
	// Get formats from store
	const formats = formatsStore.get()

	// Find the input format
	const format = formats.find((f) => f.id === inputFormat)

	// Check if output format is in compatible outputs
	return !!format && format.outputFormats.includes(outputFormat)
}

/**
 * Get format information by code
 * @param formatCode Format code to look up
 * @returns Format information or undefined if not found
 */
export function getFormatInfo(formatCode: string): FormatInfo | undefined {
	const formats = formatsStore.get()
	return formats.find((f) => f.id === formatCode)
}

export default useSupportedFormats

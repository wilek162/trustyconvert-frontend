import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { client } from '@/lib/api/client'
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

/**
 * Hook to fetch and manage supported file formats
 */
export function useSupportedFormats() {
	// Get formats from store
	const formats = useStore(formatsStore)
	const inputFormats = useStore(inputFormatsStore)
	const outputFormats = useStore(outputFormatsStore)
	const loadingState = useStore(formatsLoadingStore)

	// Use React Query to fetch formats
	const query = useQuery({
		queryKey: ['supported-formats'],
		queryFn: async () => {
			try {
				debugLog('Fetching supported formats')
				const response = await client.getSupportedFormats()
				
				if (!response.formats) {
					throw new Error('No formats returned from API')
				}
				
				// Update the formats store
				loadFormats(response.formats)
				
				return response.formats
			} catch (error) {
				debugError('Error fetching formats:', error)
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
	const format = formats.find(f => f.code === inputFormat)
	
	// Return compatible output formats
	return format?.compatibleOutputs || []
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
	const format = formats.find(f => f.code === inputFormat)
	
	// Check if output format is in compatible outputs
	return !!format && format.compatibleOutputs.includes(outputFormat)
}

/**
 * Get format information by code
 * @param formatCode Format code to look up
 * @returns Format information or undefined if not found
 */
export function getFormatInfo(formatCode: string): FormatInfo | undefined {
	const formats = formatsStore.get()
	return formats.find(f => f.code === formatCode)
}

export default useSupportedFormats

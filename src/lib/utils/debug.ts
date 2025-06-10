/**
 * Debug logging utility for development
 * Usage: debugLog('message', data)
 */
export function debugLog(message: string, data?: any) {
	if (import.meta.env?.MODE === 'development' || process.env.NODE_ENV === 'development') {
		if (data !== undefined) {
			// eslint-disable-next-line no-console
			console.log(`[DEBUG] ${message}`, data)
		} else {
			// eslint-disable-next-line no-console
			console.log(`[DEBUG] ${message}`)
		}
	}
}

/**
 * Debug error logging utility
 * Usage: debugError('message', error)
 */
export function debugError(message: string, error?: any) {
	if (import.meta.env?.MODE === 'development' || process.env.NODE_ENV === 'development') {
		// eslint-disable-next-line no-console
		console.error(`[DEBUG ERROR] ${message}`, error)
	}
}

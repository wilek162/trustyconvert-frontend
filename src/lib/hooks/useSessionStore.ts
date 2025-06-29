import { getCSRFToken, hasCsrfToken } from '@/lib/stores/session'
import { apiClient } from '@/lib/api/client'
import { debugLog } from '@/lib/utils/debug'

/**
 * Hook for accessing session information in both Astro and React components
 * This provides a convenient interface for session-related operations
 */
export function useSessionStore() {
	/**
	 * Initialize the session
	 */
	const initSession = async () => {
		try {
			await apiClient.initSession()
			return true
		} catch (error) {
			debugLog('Failed to initialize session:', error)
			return false
		}
	}

	/**
	 * Close the session and clean up resources
	 */
	const closeSession = async () => {
		try {
			await apiClient.closeSession()
			return true
		} catch (error) {
			debugLog('Failed to close session:', error)
			return false
		}
	}

	return {
		csrfToken: getCSRFToken(),
		hasSession: hasCsrfToken(),
		initSession,
		closeSession
	}
}

export default useSessionStore

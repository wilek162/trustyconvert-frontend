import { useStore as useNanoStore } from '@nanostores/react'
import { sessionStore, setCSRFToken, clearSession } from '@/lib/stores/session'
import { apiClient } from '@/lib/api/client'

/**
 * Hook for accessing and managing the session store in both Astro and React components
 * This provides a convenient interface for session-related operations
 */
export function useSessionStore() {
	// Get the current session state
	const session = useNanoStore(sessionStore)

	/**
	 * Initialize the session
	 */
	const initSession = async () => {
		try {
			const response = await apiClient.initSession()
			setCSRFToken(response.csrf_token)
			return true
		} catch (error) {
			console.error('Failed to initialize session:', error)
			return false
		}
	}

	/**
	 * Close the session and clean up resources
	 */
	const closeSession = async () => {
		try {
			await apiClient.closeSession()
			clearSession()
			return true
		} catch (error) {
			console.error('Failed to close session:', error)
			return false
		}
	}

	return {
		session,
		initSession,
		closeSession,
		csrfToken: session.csrfToken,
		isInitialized: session.isInitialized
	}
}

export default useSessionStore

import { useEffect, useState } from 'react'
import { useStore } from '@nanostores/react'
import { apiClient } from '@/lib/api/client'
import { sessionStore, getInitialized, setInitializing } from '@/lib/stores/session'
import {
	syncCsrfTokenFromCookie,
	createCsrfErrorListener,
	hasCsrfToken
} from '@/lib/utils/csrfUtils'

/**
 * A hook that initializes the session and CSRF token
 * This implements the Double Submit Cookie pattern for CSRF protection
 * by getting the token from cookies rather than storing it in memory
 *
 * @returns {Object} Session state including initialization status and errors
 */
export function useSessionInitializer() {
	const session = useStore(sessionStore)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const initializeSession = async () => {
			// First check if we already have a token in the cookie
			const hasToken = hasCsrfToken()

			// Sync from cookie to store if a token exists
			if (hasToken) {
				syncCsrfTokenFromCookie()
			}

			// Skip full initialization if already initialized, initializing, or token exists
			if (hasToken || getInitialized() || session.isInitializing) {
				return
			}

			try {
				setInitializing(true)

				// Initialize the session - this will cause the server to set a cookie
				await apiClient.initSession()

				// The token should now be in the cookie - we don't need to manually
				// set it from the response as syncCsrfTokenFromCookie already does this
			} catch (error) {
				console.error('Failed to initialize session:', error)
				setError('Session initialization failed. Please refresh the page.')
			}
		}

		// Initialize session
		initializeSession()

		// Set up a listener for CSRF errors that will reload the page
		const removeListener = createCsrfErrorListener()

		// Clean up the listener on unmount
		return () => removeListener()
	}, [session.isInitializing])

	return {
		isInitialized: session.isInitialized || hasCsrfToken(),
		isInitializing: session.isInitializing,
		error
	}
}

export default useSessionInitializer

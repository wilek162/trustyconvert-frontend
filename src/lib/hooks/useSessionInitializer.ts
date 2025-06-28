import { useEffect, useState, useCallback } from 'react'
import { useStore } from '@nanostores/react'
import { apiClient } from '@/lib/api/client'
import { sessionStore, getInitialized, setInitializing, setCSRFToken } from '@/lib/stores/session'
import {
	syncCsrfTokenFromCookie,
	createCsrfErrorListener,
	hasCsrfToken
} from '@/lib/utils/csrfUtils'
import { handleError, SessionError } from '@/lib/utils/errorHandling'
import { useToast } from '@/lib/hooks/useToast'

/**
 * A hook that initializes the session and CSRF token
 * This implements the Double Submit Cookie pattern for CSRF protection
 * by getting the token from cookies rather than storing it in memory
 *
 * @returns {Object} Session state including initialization status, errors, and reset function
 */
export function useSessionInitializer() {
	const session = useStore(sessionStore)
	const [error, setError] = useState<string | null>(null)
	const [retryCount, setRetryCount] = useState(0)
	const { addToast } = useToast()
	const MAX_RETRIES = 3

	/**
	 * Reset the session and attempt to initialize again
	 */
	const resetSession = useCallback(async () => {
		setRetryCount((count) => count + 1)
		setError(null)
		setInitializing(false)
	}, [])

	useEffect(() => {
		const initializeSession = async () => {
			// First check if we already have a token in the cookie
			const hasToken = hasCsrfToken()

			// Sync from cookie to store if a token exists
			if (hasToken) {
				syncCsrfTokenFromCookie()
				return
			}

			// Skip full initialization if already initialized, initializing, or token exists
			if (getInitialized() || session.isInitializing) {
				return
			}

			try {
				setInitializing(true)

				// Initialize the session - this will cause the server to set a cookie
				const response = await apiClient.initSession()

				// If the API returned a CSRF token directly, store it
				if (response && response.csrf_token) {
					setCSRFToken(response.csrf_token, response.id, response.expires_at)
				} else {
					// Otherwise try to get it from the cookie
					syncCsrfTokenFromCookie()
				}

				// Check if we have a token after initialization
				if (!hasCsrfToken() && !session.csrfToken) {
					throw new SessionError({
						message: 'No CSRF token received from server',
						userMessage: 'Session initialization failed. Please refresh the page.'
					})
				}
			} catch (error) {
				// Use the centralized error handler
				const errorMessage = handleError(error, {
					context: { component: 'useSessionInitializer', retryCount }
				})

				setError(errorMessage)
				setInitializing(false)

				// Show toast for errors
				addToast({
					title: 'Session Error',
					description: errorMessage,
					variant: 'destructive'
				})

				// Auto-retry if under max attempts
				if (retryCount < MAX_RETRIES) {
					const delay = Math.pow(2, retryCount) * 1000 // Exponential backoff
					setTimeout(resetSession, delay)
				}
			}
		}

		// Initialize session
		initializeSession()

		// Set up a listener for CSRF errors that will reload the page
		const removeListener = createCsrfErrorListener()

		// Clean up the listener on unmount
		return () => removeListener()
	}, [session.isInitializing, retryCount, resetSession, addToast])

	return {
		isInitialized: session.isInitialized || hasCsrfToken(),
		isInitializing: session.isInitializing,
		error,
		resetSession
	}
}

export default useSessionInitializer

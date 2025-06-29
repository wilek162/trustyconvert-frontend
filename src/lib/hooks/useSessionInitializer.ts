import { useEffect, useState, useCallback, useRef } from 'react'
import { hasCsrfToken } from '@/lib/stores/session'
import { debugLog } from '@/lib/utils/debug'
import { apiClient } from '@/lib/api/client'

/**
 * A hook that provides access to session state and initialization
 * This is a simplified version that checks for the presence of a CSRF token
 * and provides methods to initialize or reset the session.
 *
 * @returns {Object} Session state including CSRF token status and methods
 */
export function useSessionInitializer() {
	const [hasToken, setHasToken] = useState<boolean>(hasCsrfToken())
	const [isInitializing, setIsInitializing] = useState<boolean>(false)
	const [error, setError] = useState<string | null>(null)

	// Use a ref to track initialization attempts to avoid redundant API calls
	const initializationAttemptRef = useRef<number>(0)
	const lastCheckTimeRef = useRef<number>(Date.now())

	// Check for CSRF token with throttling to avoid excessive checks
	const checkToken = useCallback(() => {
		// Only check if it's been at least 5 seconds since the last check
		const now = Date.now()
		if (now - lastCheckTimeRef.current < 5000) {
			return
		}

		lastCheckTimeRef.current = now
		const tokenExists = hasCsrfToken()

		// Only update state if the token status has changed
		if (tokenExists !== hasToken) {
			setHasToken(tokenExists)
			debugLog(`CSRF token check: ${tokenExists ? 'found' : 'not found'}`)
		}
	}, [hasToken])

	// Check for CSRF token on mount
	useEffect(() => {
		// Check immediately
		checkToken()

		// Set up interval to periodically check, but less frequently
		const intervalId = setInterval(checkToken, 60000) // Check every minute

		return () => {
			clearInterval(intervalId)
		}
	}, [checkToken])

	// Initialize session
	const initSession = useCallback(async () => {
		// Avoid multiple simultaneous initialization attempts
		if (isInitializing) return false

		// Limit initialization attempts to avoid API hammering
		if (initializationAttemptRef.current >= 3) {
			debugLog('Maximum session initialization attempts reached')
			return false
		}

		try {
			setIsInitializing(true)
			setError(null)

			initializationAttemptRef.current += 1
			await apiClient.initSession()

			// Check if token was set after initialization
			const tokenExists = hasCsrfToken()
			setHasToken(tokenExists)

			if (!tokenExists) {
				setError('Failed to initialize session: CSRF token not found')
				return false
			}

			// Reset attempt counter on success
			initializationAttemptRef.current = 0
			return true
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			debugLog('Failed to initialize session:', error)
			setError(`Failed to initialize session: ${errorMessage}`)
			return false
		} finally {
			setIsInitializing(false)
		}
	}, [isInitializing])

	// Reset session (initialize a new one)
	const resetSession = useCallback(async () => {
		// Reset attempt counter when explicitly requesting a reset
		initializationAttemptRef.current = 0
		return initSession()
	}, [initSession])

	return {
		isInitialized: hasToken,
		isInitializing,
		error,
		hasCsrfToken: hasToken,
		initSession,
		resetSession
	}
}

export default useSessionInitializer

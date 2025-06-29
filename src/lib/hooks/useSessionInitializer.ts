import { useEffect, useState, useCallback } from 'react'
import { debugLog, debugError } from '@/lib/utils/debug'
import sessionManager from '@/lib/services/sessionManager'

/**
 * A hook that provides access to session state and initialization
 * This is a simplified version that uses the centralized session manager
 * and provides methods to initialize or reset the session.
 *
 * @returns {Object} Session state including CSRF token status and methods
 */
export function useSessionInitializer() {
	const [hasToken, setHasToken] = useState<boolean>(sessionManager.hasCsrfToken())
	const [isInitializing, setIsInitializing] = useState<boolean>(false)
	const [error, setError] = useState<string | null>(null)

	// Check for CSRF token
	const checkToken = useCallback(() => {
		const tokenExists = sessionManager.hasCsrfToken()

		// Update state if the token status has changed
		if (tokenExists !== hasToken) {
			setHasToken(tokenExists)
			debugLog(`CSRF token check: ${tokenExists ? 'found' : 'not found'}`)
		}

		return tokenExists
	}, [hasToken])

	// Check for CSRF token on mount and periodically
	useEffect(() => {
		// Check immediately
		checkToken()

		// Set up interval to periodically check
		const intervalId = setInterval(checkToken, 30000) // Check every 30 seconds

		return () => {
			clearInterval(intervalId)
		}
	}, [checkToken])

	// Initialize session
	const initSession = useCallback(async () => {
		try {
			setIsInitializing(true)
			setError(null)

			debugLog('Initializing session via hook')

			// Use the centralized session manager
			const success = await sessionManager.initSession()

			// Check if token was set after initialization
			const tokenExists = checkToken()

			if (!success || !tokenExists) {
				debugError('Failed to initialize session: CSRF token not found after initialization')
				setError('Failed to initialize session: CSRF token not found')
				return false
			}

			debugLog('Session initialized successfully via hook')
			return true
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			debugError('Failed to initialize session:', error)
			setError(`Failed to initialize session: ${errorMessage}`)
			return false
		} finally {
			setIsInitializing(false)
		}
	}, [checkToken])

	// Reset session (initialize a new one)
	const resetSession = useCallback(async () => {
		try {
			setIsInitializing(true)
			setError(null)

			debugLog('Resetting session via hook')

			// Use the centralized session manager
			const success = await sessionManager.resetSession()

			// Check if token was set after reset
			const tokenExists = checkToken()

			if (!success || !tokenExists) {
				debugError('Failed to reset session: CSRF token not found after reset')
				setError('Failed to reset session: CSRF token not found')
				return false
			}

			debugLog('Session reset successfully via hook')
			return true
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			debugError('Failed to reset session:', error)
			setError(`Failed to reset session: ${errorMessage}`)
			return false
		} finally {
			setIsInitializing(false)
		}
	}, [checkToken])

	return {
		isInitialized: hasToken,
		isInitializing,
		error,
		hasCsrfToken: hasToken,
		initSession,
		resetSession,
		checkToken
	}
}

export default useSessionInitializer

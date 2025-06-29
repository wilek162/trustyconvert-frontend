import { useEffect, useState, useCallback, useRef } from 'react'
import { useStore } from '@nanostores/react'
import { sessionStore, isSessionValid } from '@/lib/stores/session'
import { sessionManager } from '@/lib/api/sessionManager'
import { useToast } from '@/lib/hooks/useToast'
import { debugLog, debugError } from '@/lib/utils/debug'

/**
 * A hook that provides access to session state and initialization
 * This is a thin wrapper around the sessionManager that provides React integration
 *
 * @returns {Object} Session state including initialization status, errors, and reset function
 */
export function useSessionInitializer() {
	const session = useStore(sessionStore)
	const [error, setError] = useState<string | null>(null)
	const { addToast } = useToast()
	const validationTimerRef = useRef<number | null>(null)

	/**
	 * Reset the session and attempt to initialize again
	 */
	const resetSession = useCallback(async () => {
		setError(null)
		debugLog('Resetting session via useSessionInitializer')

		try {
			await sessionManager.reset()
			debugLog('Session reset successful')
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			debugError('Session reset failed', error)
			setError(errorMessage)
			addToast({
				title: 'Session Error',
				description: 'Failed to initialize session. Please refresh the page.',
				variant: 'destructive'
			})
		}
	}, [addToast])

	/**
	 * Check if the session is valid and initialize if needed
	 */
	const checkAndInitializeSession = useCallback(async () => {
		// Check if session is valid
		if (isSessionValid()) {
			debugLog('Session is valid, no initialization needed')
			return
		}

		// Session is invalid or not initialized, try to initialize
		debugLog('Session is invalid or not initialized, initializing')
		const sessionState = sessionManager.getState()

		// Only initialize if not already initializing
		if (!sessionState.isInitializing) {
			try {
				await sessionManager.initialize()
				debugLog('Session initialization successful')
				setError(null)
			} catch (err) {
				debugError('Session initialization failed', err)
				const errorMessage = err instanceof Error ? err.message : String(err)
				setError(errorMessage)
			}
		}
	}, [])

	// Initialize the session when the component mounts, but only if not already initialized
	useEffect(() => {
		// Use a local variable to track if the component is still mounted
		let isMounted = true

		const sessionState = sessionManager.getState()
		if (!sessionState.isInitialized && !sessionState.isInitializing) {
			debugLog('Session not initialized, initializing')

			sessionManager
				.initialize()
				.then(() => {
					// Only update state if the component is still mounted
					if (isMounted && sessionState.error) {
						setError(sessionState.error)
					}
				})
				.catch((error) => {
					// Only update state if the component is still mounted
					if (isMounted) {
						debugError('Session initialization failed in useEffect', error)
						const errorMessage = error instanceof Error ? error.message : String(error)
						setError(errorMessage)
					}
				})
		} else if (!isSessionValid() && !sessionState.isInitializing) {
			// Session is initialized but not valid (e.g., expired), reset it
			debugLog('Session initialized but invalid, resetting')
			resetSession()
		}

		// Set up a timer to periodically validate the session
		validationTimerRef.current = window.setInterval(() => {
			if (isMounted && !sessionState.isInitializing) {
				// Check session validity every minute
				const isValid = isSessionValid()
				debugLog('Periodic session validation check', { isValid })

				if (!isValid) {
					debugLog('Session invalid during periodic check, refreshing')
					sessionManager.checkRefresh().catch((err) => {
						debugError('Error refreshing session during periodic check', err)
					})
				}
			}
		}, 60 * 1000) // Check every minute

		// Cleanup function to prevent state updates after unmount
		return () => {
			isMounted = false
			if (validationTimerRef.current !== null) {
				window.clearInterval(validationTimerRef.current)
				validationTimerRef.current = null
			}
		}
	}, [resetSession])

	// Update local error state when store error changes
	useEffect(() => {
		if (session.lastInitializationError && !error) {
			setError(session.lastInitializationError)
		}
	}, [session.lastInitializationError, error])

	const sessionState = sessionManager.getState()

	return {
		isInitialized: sessionState.isInitialized,
		isInitializing: sessionState.isInitializing,
		error: error || sessionState.error,
		resetSession,
		checkSession: checkAndInitializeSession,
		attempts: sessionState.attempts,
		isValid: sessionState.isValid,
		sessionId: sessionState.sessionId,
		expiresAt: sessionState.expiresAt
	}
}

export default useSessionInitializer

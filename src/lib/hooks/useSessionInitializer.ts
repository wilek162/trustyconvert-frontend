import { useEffect, useState, useCallback } from 'react'
import { useStore } from '@nanostores/react'
import { sessionStore } from '@/lib/stores/session'
import { sessionManager } from '@/lib/api/sessionManager'
import { useToast } from '@/lib/hooks/useToast'

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

	/**
	 * Reset the session and attempt to initialize again
	 */
	const resetSession = useCallback(async () => {
		setError(null)

		try {
			await sessionManager.reset()
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			setError(errorMessage)
			addToast({
				title: 'Session Error',
				description: 'Failed to initialize session. Please refresh the page.',
				variant: 'destructive'
			})
		}
	}, [addToast])

	useEffect(() => {
		// Initialize the session when the component mounts, but only if not already initialized
		const sessionState = sessionManager.getState()
		if (!sessionState.isInitialized && !sessionState.isInitializing) {
			// Use a local variable to track if the component is still mounted
			let isMounted = true

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
						console.error('Session initialization failed:', error)
						const errorMessage = error instanceof Error ? error.message : String(error)
						setError(errorMessage)
					}
				})

			// Cleanup function to prevent state updates after unmount
			return () => {
				isMounted = false
			}
		}
	}, [])

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
		attempts: sessionState.attempts
	}
}

export default useSessionInitializer

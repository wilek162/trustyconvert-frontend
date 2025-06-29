import React, { useEffect, useState, useRef } from 'react'
import { useToast } from '@/lib/hooks/useToast'
import { debugLog, debugError } from '@/lib/utils/debug'
import { createCsrfErrorListener } from '@/lib/utils/csrfUtils'
import sessionManager from '@/lib/services/sessionManager'

interface SessionProviderProps {
	children: React.ReactNode
}

/**
 * SessionProvider component
 *
 * Handles session initialization, CSRF token validation, and error recovery.
 * The actual session is managed by the server through HTTP-only cookies.
 */
export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
	const { addToast } = useToast()
	const [error, setError] = useState<string | null>(null)
	const [isInitializing, setIsInitializing] = useState(false)
	const csrfErrorCountRef = useRef(0)
	const lastCsrfErrorTimeRef = useRef(0)
	const initAttemptedRef = useRef(false)

	// Initialize session on mount using the debounced version to prevent duplicate calls
	useEffect(() => {
		const initializeSession = async () => {
			if (initAttemptedRef.current) return

			try {
				initAttemptedRef.current = true
				setIsInitializing(true)
				debugLog('SessionProvider: Checking for existing session')

				// Use the debounced version to prevent duplicate calls
				const success = await sessionManager.debouncedInitSession()

				if (success) {
					debugLog('SessionProvider: Session initialized successfully')
					setError(null)
				} else {
					debugError('SessionProvider: Failed to initialize session')
					setError('Failed to initialize session')

					// Try one more time after a delay
					setTimeout(async () => {
						try {
							debugLog('SessionProvider: Retrying session initialization')
							await sessionManager.resetSession()
							setError(null)
						} catch (retryErr) {
							debugError('SessionProvider: Failed to initialize session on retry:', retryErr)
						}
					}, 2000)
				}
			} catch (err) {
				debugError('SessionProvider: Failed to initialize session on mount:', err)
				const errorMessage = err instanceof Error ? err.message : 'Unknown error'
				setError(`Session initialization failed: ${errorMessage}`)
			} finally {
				setIsInitializing(false)
			}
		}

		initializeSession()
	}, [])

	// Set up CSRF error handling
	useEffect(() => {
		// Set up CSRF error listener
		const removeListener = createCsrfErrorListener(() => {
			debugLog('CSRF error detected in SessionProvider')

			const now = Date.now()
			const timeSinceLastError = now - lastCsrfErrorTimeRef.current

			// Only count errors that happen more than 5 seconds apart
			// This prevents multiple errors from a single issue triggering multiple toasts
			if (timeSinceLastError > 5000) {
				csrfErrorCountRef.current += 1
				lastCsrfErrorTimeRef.current = now

				// Show a message when we've encountered a CSRF error
				addToast({
					title: 'Security Verification Error',
					description: 'Unable to verify your session security. Refreshing your session...',
					variant: 'destructive',
					duration: 5000
				})

				// Always reset the session on CSRF error to get a fresh token
				sessionManager.resetSession().catch((err) => {
					debugError('Failed to reset session after CSRF error:', err)
				})
			}
		})

		return () => {
			debugLog('SessionProvider unmounting')
			removeListener()
		}
	}, [addToast])

	// Force session refresh when window regains focus
	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				debugLog('Page became visible, checking session')

				// First synchronize any existing token from cookie to memory
				const tokenSynced = sessionManager.synchronizeTokenFromCookie()

				// Only reset the session if we don't have a valid token
				if (!tokenSynced || !sessionManager.hasCsrfToken()) {
					debugLog('No valid session after visibility change, resetting session')
					sessionManager.resetSession().catch((err) => {
						debugError('Failed to refresh session on visibility change:', err)
					})
				} else {
					debugLog('Valid session exists after visibility change')
				}
			}
		}

		document.addEventListener('visibilitychange', handleVisibilityChange)

		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange)
		}
	}, [])

	// Show error toast if session initialization fails
	useEffect(() => {
		if (error) {
			addToast({
				title: 'Session Error',
				description: 'Failed to establish a secure session. Please refresh the page.',
				variant: 'destructive',
				duration: 10000
			})
		}
	}, [error, addToast])

	return <>{children}</>
}

export default SessionProvider

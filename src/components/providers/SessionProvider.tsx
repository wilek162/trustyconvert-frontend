import React, { useEffect, useState, useRef } from 'react'
import { useSessionInitializer } from '@/lib/hooks/useSessionInitializer'
import { useToast } from '@/lib/hooks/useToast'
import { handleError } from '@/lib/utils/errorHandling'
import { sessionManager } from '@/lib/api/sessionManager'
import { cleanupApi } from '@/lib/api/initializeApi'
import { debugLog, debugError } from '@/lib/utils/debug'
import { createCsrfErrorListener, syncCsrfTokenFromCookie } from '@/lib/utils/csrfUtils'
import { SESSION } from '@/lib/config/constants'

interface SessionProviderProps {
	children: React.ReactNode
}

/**
 * SessionProvider component
 *
 * Manages the API session lifecycle and provides session state to the application.
 * Handles session initialization, error recovery, and cleanup.
 */
export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
	const { isInitialized, isInitializing, error, resetSession, attempts } = useSessionInitializer()
	const { addToast } = useToast()
	const [retryCount, setRetryCount] = useState(0)
	const refreshIntervalRef = useRef<number | null>(null)
	const MAX_RETRIES = 3

	// Initialize session when component mounts
	useEffect(() => {
		debugLog('SessionProvider mounted')

		// Attempt to sync CSRF token from cookie on mount
		// This helps with cases where the token exists in the cookie but not in the store
		syncCsrfTokenFromCookie()

		// Check session validity on mount, but don't retry automatically if we've hit the limit
		if (retryCount < MAX_RETRIES) {
			sessionManager.checkRefresh().catch((err) => {
				handleError(err, {
					context: { component: 'SessionProvider', action: 'checkRefresh' }
				})
			})
		}

		// Set up CSRF error listener
		const removeListener = createCsrfErrorListener(() => {
			debugLog('CSRF error detected in SessionProvider')
			// Only attempt reset if we haven't exceeded retry limit
			if (retryCount < MAX_RETRIES) {
				setRetryCount((prev) => prev + 1)
				// Use skipClose=true to avoid potential loops
				sessionManager.reset(true).catch((err) => {
					debugError('Failed to reset session after CSRF error', err)
				})
			} else {
				// Show a message when we've exceeded retry attempts
				addToast({
					title: 'Security Error',
					description: 'Unable to verify your session security. Please refresh the page.',
					variant: 'destructive',
					duration: 10000
				})
			}
		})

		return () => {
			debugLog('SessionProvider unmounting')
			removeListener()

			// Clear any refresh interval
			if (refreshIntervalRef.current !== null) {
				window.clearInterval(refreshIntervalRef.current)
			}
		}
	}, [retryCount, addToast])

	// Set up periodic session refresh
	useEffect(() => {
		// Only set up refresh interval if session is initialized
		if (isInitialized && !isInitializing) {
			debugLog('Setting up periodic session refresh')

			// Clear any existing interval
			if (refreshIntervalRef.current !== null) {
				window.clearInterval(refreshIntervalRef.current)
			}

			// Check session every 5 minutes (or half the refresh threshold)
			const refreshInterval = Math.min(5 * 60 * 1000, SESSION.REFRESH_THRESHOLD / 2)

			refreshIntervalRef.current = window.setInterval(() => {
				debugLog('Performing periodic session refresh check')
				sessionManager.checkRefresh().catch((err) => {
					debugError('Error during periodic session refresh', err)
				})
			}, refreshInterval)

			return () => {
				if (refreshIntervalRef.current !== null) {
					window.clearInterval(refreshIntervalRef.current)
					refreshIntervalRef.current = null
				}
			}
		}
	}, [isInitialized, isInitializing])

	// Show error toast if session initialization fails
	useEffect(() => {
		if (error) {
			// Increment retry count
			setRetryCount((prev) => prev + 1)

			// Only show toast if we haven't exceeded max retries
			if (retryCount < MAX_RETRIES) {
				addToast({
					title: 'Session Error',
					description: 'There was a problem connecting to the server. Retrying...',
					variant: 'destructive',
					action: {
						label: 'Retry Now',
						onClick: () => {
							// Reset retry count when user explicitly requests retry
							sessionManager.resetAttempts()
							setRetryCount(0)
							// Use skipClose=true to avoid potential loops
							sessionManager.reset(true).catch(console.error)
						}
					}
				})
			} else {
				// Show a different message when we've exceeded retry attempts
				addToast({
					title: 'Connection Problem',
					description:
						'Unable to establish a secure connection. Please refresh the page or try again later.',
					variant: 'destructive',
					duration: 10000, // Show for longer
					action: {
						label: 'Try Again',
						onClick: () => {
							// Reset retry count when user explicitly requests retry
							sessionManager.resetAttempts()
							setRetryCount(0)
							// Use skipClose=true to avoid potential loops
							sessionManager.reset(true).catch(console.error)
						}
					}
				})
			}
		}
	}, [error, addToast, retryCount])

	// Clean up session on unmount (e.g., when user navigates away)
	useEffect(() => {
		return () => {
			// Only attempt to close the session if it was initialized
			if (isInitialized) {
				debugLog('Cleaning up API resources on SessionProvider unmount')
				cleanupApi()
			}
		}
	}, [isInitialized])

	// Force session refresh when window regains focus
	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible' && !isInitializing) {
				debugLog('Page became visible, checking session validity')
				sessionManager.checkRefresh().catch((err) => {
					debugError('Error checking session on visibility change', err)
				})
			}
		}

		document.addEventListener('visibilitychange', handleVisibilityChange)

		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange)
		}
	}, [isInitializing])

	return <>{children}</>
}

export default SessionProvider

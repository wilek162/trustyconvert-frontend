import React, { useEffect, useState, useRef } from 'react'
import { useToast } from '@/lib/hooks/useToast'
import { debugLog, debugError } from '@/lib/utils/debug'
import { createCsrfErrorListener, getCsrfTokenFromCookie } from '@/lib/utils/csrfUtils'
import { useSessionInitializer } from '@/lib/hooks/useSessionInitializer'

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
	const { isInitialized, isInitializing, error, initSession } = useSessionInitializer()
	const [hasInitializedOnMount, setHasInitializedOnMount] = useState(false)
	const csrfErrorCountRef = useRef(0)
	const lastCsrfErrorTimeRef = useRef(0)

	// Initialize session on mount if needed
	useEffect(() => {
		debugLog('SessionProvider mounted')

		// Check if we have a CSRF token on mount
		const csrfToken = getCsrfTokenFromCookie()
		if (!csrfToken && !hasInitializedOnMount) {
			debugLog('No CSRF token found on mount')
			// Initialize session if no CSRF token is found
			initSession().catch((err) => {
				debugError('Failed to initialize session:', err)
			})
			setHasInitializedOnMount(true)
		} else {
			debugLog('CSRF token found on mount')
		}
	}, [initSession, hasInitializedOnMount])

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
					description: 'Unable to verify your session security. Please try again.',
					variant: 'destructive',
					duration: 10000
				})

				// Only initialize a new session if we've had multiple CSRF errors
				// This prevents unnecessary session reinitialization for transient issues
				if (csrfErrorCountRef.current >= 3) {
					debugLog('Multiple CSRF errors detected, initializing new session')

					// Reset the counter
					csrfErrorCountRef.current = 0

					// Try to initialize a new session
					initSession().catch((err) => {
						debugError('Failed to initialize session after CSRF error:', err)
					})
				}
			}
		})

		return () => {
			debugLog('SessionProvider unmounting')
			removeListener()
		}
	}, [addToast, initSession])

	// Force session refresh when window regains focus to ensure CSRF token is valid
	// But only if we don't already have a token
	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				debugLog('Page became visible, checking CSRF token')
				const csrfToken = getCsrfTokenFromCookie()
				if (!csrfToken) {
					debugLog('No CSRF token found after visibility change')
					// Initialize session if no CSRF token is found
					initSession().catch((err) => {
						debugError('Failed to initialize session after visibility change:', err)
					})
				}
			}
		}

		document.addEventListener('visibilitychange', handleVisibilityChange)

		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange)
		}
	}, [initSession])

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

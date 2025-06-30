import React, { createContext, useContext, useState, useEffect } from 'react'
import sessionManager from '@/lib/services/sessionManager'
import { useStore } from '@nanostores/react'
import { csrfToken, sessionInitialized } from '@/lib/stores/session'
import { createCsrfErrorListener } from '@/lib/utils/csrfUtils'
import { debugLog, debugError } from '@/lib/utils/debug'

// Define the context type
interface SessionContextType {
	// Session state
	isInitialized: boolean
	isInitializing: boolean
	hasCsrfToken: boolean

	// Session actions
	ensureSession: () => Promise<boolean>
	resetSession: () => Promise<boolean>

	// Error information
	lastError: string | null
	detailedError: unknown | null

	// Debug information
	getDebugInfo: () => Record<string, any>
}

// Create the context with default values
const SessionContext = createContext<SessionContextType>({
	isInitialized: false,
	isInitializing: false,
	hasCsrfToken: false,
	ensureSession: async () => false,
	resetSession: async () => false,
	lastError: null,
	detailedError: null,
	getDebugInfo: () => ({})
})

// Hook for using the session context
export const useSession = () => useContext(SessionContext)

interface SessionProviderProps {
	children: React.ReactNode
}

/**
 * SessionContextProvider
 *
 * Provides session state and actions to the entire application
 * Acts as the single source of truth for session state
 */
export function SessionContextProvider({ children }: SessionProviderProps) {
	// Use nanostores for session state
	const csrfTokenValue = useStore(csrfToken)
	const isSessionInitialized = useStore(sessionInitialized)

	// Local state
	const [isInitializing, setIsInitializing] = useState(false)
	const [lastError, setLastError] = useState<string | null>(null)
	const [detailedError, setDetailedError] = useState<unknown | null>(null)

	// Derived state
	const hasCsrfToken = Boolean(csrfTokenValue)

	// Initialize session on mount
	useEffect(() => {
		const initializeSession = async () => {
			// First try to synchronize from cookie
			if (sessionManager.synchronizeTokenFromCookie()) {
				return
			}

			// If no token in cookie, initialize a new session
			try {
				setIsInitializing(true)
				await sessionManager.initSession()
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'Unknown error'
				setLastError(`Session initialization failed: ${errorMessage}`)
				setDetailedError(error)
				debugLog('Session initialization error:', error)
			} finally {
				setIsInitializing(false)
			}
		}

		// Only initialize if not already initialized
		if (!isSessionInitialized && !hasCsrfToken) {
			initializeSession()
		}
	}, [isSessionInitialized, hasCsrfToken])

	// Handle visibility changes
	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				// First synchronize any existing token from cookie to memory
				if (
					!sessionManager.synchronizeTokenFromCookie() &&
					!sessionManager.isInitializationInProgress()
				) {
					// Only initialize a new session if we don't have a valid token and no initialization is in progress
					sessionManager.initSession()
				}
			}
		}

		document.addEventListener('visibilitychange', handleVisibilityChange)
		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange)
		}
	}, [])

	// Handle CSRF errors
	useEffect(() => {
		const removeCsrfErrorListener = createCsrfErrorListener(() => {
			debugLog('CSRF error detected, attempting to refresh token')

			// First check if we can get a token from the cookie
			if (
				!sessionManager.synchronizeTokenFromCookie() &&
				!sessionManager.isInitializationInProgress()
			) {
				// If no token in cookie, try to get a new one from the server
				setIsInitializing(true)
				sessionManager.initSession().finally(() => {
					setIsInitializing(false)
				})
			}
		})

		return removeCsrfErrorListener
	}, [])

	// Session actions
	const ensureSession = async (): Promise<boolean> => {
		try {
			setIsInitializing(true)
			return await sessionManager.ensureSession()
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			setLastError(`Session validation failed: ${errorMessage}`)
			setDetailedError(error)

			// In development mode, log detailed error information
			if (import.meta.env.DEV) {
				console.group('Session Validation Error')
				console.error('Error details:', error)
				console.log('Session state:', sessionManager.getSessionState())
				console.groupEnd()
			}

			return false
		} finally {
			setIsInitializing(false)
		}
	}

	const resetSession = async (): Promise<boolean> => {
		try {
			setIsInitializing(true)
			setLastError(null)
			setDetailedError(null)
			return await sessionManager.resetSession()
		} finally {
			setIsInitializing(false)
		}
	}

	// Debug information
	const getDebugInfo = (): Record<string, any> => {
		return {
			...sessionManager.getSessionState(),
			lastError,
			detailedError,
			csrfTokenExists: Boolean(csrfTokenValue),
			cookieTokenExists: Boolean(sessionManager.getCsrfTokenFromCookie())
		}
	}

	// Context value
	const contextValue: SessionContextType = {
		isInitialized: isSessionInitialized,
		isInitializing,
		hasCsrfToken,
		ensureSession,
		resetSession,
		lastError,
		detailedError,
		getDebugInfo
	}

	return <SessionContext.Provider value={contextValue}>{children}</SessionContext.Provider>
}

export default SessionContextProvider

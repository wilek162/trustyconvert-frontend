import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import sessionManager from '@/lib/services/sessionManager'
import { debugLog, debugError } from '@/lib/utils/debug'

// Define the context type
interface SessionContextType {
	isSessionInitialized: boolean
	isInitializing: boolean
	sessionId: string | null
	csrfToken: string | null
	initSession: () => Promise<boolean>
	resetSession: () => Promise<void>
}

// Create context with default values
const SessionContext = createContext<SessionContextType>({
	isSessionInitialized: false,
	isInitializing: false,
	sessionId: null,
	csrfToken: null,
	initSession: async () => false,
	resetSession: async () => {}
})

// Hook for using the session context
export const useSession = () => useContext(SessionContext)

// Session provider component
export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [isInitializing, setIsInitializing] = useState(false)
	const [isSessionInitialized, setIsSessionInitialized] = useState(false)
	const [sessionId, setSessionId] = useState<string | null>(null)
	const [csrfToken, setCsrfToken] = useState<string | null>(null)
	const hasAttemptedInitRef = useRef(false)

	// Initialize session on first render
	useEffect(() => {
		// Check if we already have a session
		const sessionState = sessionManager.getSessionState()
		if (sessionState.sessionInitialized && sessionState.hasCsrfToken) {
			debugLog('Session already initialized in context')
			setIsSessionInitialized(true)
			setCsrfToken(sessionManager.getCsrfToken())
			return
		}

		// Prevent multiple initialization attempts
		if (hasAttemptedInitRef.current || isInitializing || sessionManager.isInitializationInProgress()) {
			debugLog('Skipping duplicate session initialization attempt')
			return
		}
		
		// Mark that we've attempted initialization
		hasAttemptedInitRef.current = true

		// Auto-initialize session on application startup
		debugLog('Auto-initializing session on application startup')
		
		// Use a short delay to ensure all components are mounted
		const initTimer = setTimeout(() => {
			initSession().catch((error) => {
				debugError('Failed to auto-initialize session', error)
			})
		}, 100)
		
		// Clean up the timer if the component unmounts
		return () => clearTimeout(initTimer)
	}, [])

	// Update context when session state changes
	useEffect(() => {
		const updateFromStore = () => {
			const token = sessionManager.getCsrfToken()
			const state = sessionManager.getSessionState()
			setCsrfToken(token)
			setIsSessionInitialized(state.sessionInitialized)
		}

		// Set up event listeners for CSRF token changes
		const handleCsrfChange = () => {
			debugLog('CSRF token changed, updating context')
			updateFromStore()
		}

		// Add event listener
		window.addEventListener('csrf-token-changed', handleCsrfChange)

		// Initial update
		updateFromStore()

		// Cleanup
		return () => {
			window.removeEventListener('csrf-token-changed', handleCsrfChange)
		}
	}, [])

	// Initialize session
	const initSession = async (): Promise<boolean> => {
		if (isInitializing) {
			debugLog('Session initialization already in progress')
			return false
		}

		try {
			setIsInitializing(true)
			debugLog('Initializing session from context')

			// Use sessionManager.initSession directly for more control
			const success = await sessionManager.initSession()

			if (success) {
				debugLog('Session initialized successfully')
				setIsSessionInitialized(true)
				setCsrfToken(sessionManager.getCsrfToken())
			} else {
				debugError('Failed to initialize session')
				setIsSessionInitialized(false)
			}

			return success
		} catch (error) {
			debugError('Error initializing session', error)
			return false
		} finally {
			setIsInitializing(false)
		}
	}

	// Reset session
	const resetSession = async (): Promise<void> => {
		try {
			await sessionManager.resetSession()
			setIsSessionInitialized(false)
			setCsrfToken(null)
			setSessionId(null)
		} catch (error) {
			debugError('Error resetting session', error)
		}
	}

	// Context value
	const contextValue: SessionContextType = {
		isSessionInitialized,
		isInitializing,
		sessionId,
		csrfToken,
		initSession,
		resetSession
	}

	return <SessionContext.Provider value={contextValue}>{children}</SessionContext.Provider>
}

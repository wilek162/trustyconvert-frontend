/**
 * Session Store
 *
 * Provides state management for session data using nanostores.
 * Handles CSRF tokens and session initialization status.
 */
import { map } from 'nanostores'
import { createDerivedStore, batchUpdate } from './storeUtils'
import { getCsrfTokenFromStore } from '@/lib/utils/csrfUtils'
import { debugLog, debugError } from '@/lib/utils/debug'
import client from '@/lib/api/client'

/**
 * Session state interface
 */
export interface SessionState {
	csrfToken: string | null;
	sessionId: string | null;
	initialized: boolean;
	expiresAt: Date | null;
	isValid: boolean;
	lastError: string | null;
	isInitializing: boolean;
}

// Initial session state
const initialSessionState: SessionState = {
	csrfToken: null,
	sessionId: null,
	initialized: false,
	expiresAt: null,
	isValid: false,
	lastError: null,
	isInitializing: false
}

// Create the session store
export const sessionStore = map<SessionState>(initialSessionState)

// Derived stores for common queries
export const isSessionValid = createDerivedStore(
	sessionStore,
	(state) => state.initialized && 
		state.csrfToken !== null && 
		state.expiresAt !== null && 
		new Date() < state.expiresAt
)

// Initialize from store on mount (only for initial page load)
if (typeof window !== 'undefined') {
	// Check if we have a token in store already
	const storeToken = getCsrfTokenFromStore()
	if (storeToken) {
		sessionStore.setKey('csrfToken', storeToken)
		sessionStore.setKey('initialized', true)
		
		// Set expiration to 24 hours from now as a fallback
		const expiresAt = new Date()
		expiresAt.setHours(expiresAt.getHours() + 24)
		sessionStore.setKey('expiresAt', expiresAt)
		
		debugLog('Session store initialized from localStorage')
	}
}

/**
 * Check if a CSRF token exists
 */
export function hasCsrfToken(): boolean {
	return sessionStore.get().csrfToken !== null
}

/**
 * Update CSRF token in store
 */
export function updateCsrfToken(token: string | null, sessionId?: string | null): void {
	if (!token) {
		debugError('Attempted to set null CSRF token')
		return
	}

	try {
		// Calculate expiration (24 hours from now)
		const expiresAt = new Date()
		expiresAt.setHours(expiresAt.getHours() + 24)
		
		// Update store with batch update
		batchUpdate(sessionStore, {
			csrfToken: token,
			sessionId: sessionId || null,
			initialized: true,
			expiresAt,
			isValid: true,
			lastError: null
		})

		// Verify the token was set correctly
		const storedToken = sessionStore.get().csrfToken
		if (storedToken !== token) {
			debugError('CSRF token update verification failed - token mismatch')
			console.error('Token mismatch:', { original: token, stored: storedToken })
			
			// Try setting it again directly
			sessionStore.setKey('csrfToken', token)
		} else {
			debugLog('CSRF token updated in store')
		}
	} catch (error) {
		debugError('Error updating CSRF token:', error)
		sessionStore.setKey('lastError', error instanceof Error ? error.message : 'Unknown error')
	}
}

/**
 * Clear session data
 */
export function clearSession(): void {
	sessionStore.set({
		...initialSessionState,
		lastError: sessionStore.get().lastError
	})
	debugLog('Session store cleared')
}

/**
 * Get the CSRF token
 */
export function getCSRFToken(): string | null {
	return sessionStore.get().csrfToken
}

/**
 * Initialize a session with the API
 * @returns Promise resolving to true if successful
 */
export async function initializeSession(forceNew = false): Promise<boolean> {
	// Don't initialize if already initializing
	if (sessionStore.get().isInitializing && !forceNew) {
		return false
	}
	
	// Set initializing state
	sessionStore.setKey('isInitializing', true)
	
	try {
		// First check if we have a valid token and not forcing new
		if (isSessionValid.get() && !forceNew) {
			sessionStore.setKey('isInitializing', false)
			return true
		}
		
		debugLog('Initializing session with API')
		await client.initSession()
		
		// The CSRF token should have been extracted and stored by processApiResponse
		// from the response headers
		if (!hasCsrfToken()) {
			throw new Error('No CSRF token received in response headers')
		}
		
		return true
	} catch (error) {
		debugError('Session initialization failed:', error)
		
		// Update store with error
		batchUpdate(sessionStore, {
			initialized: false,
			isValid: false,
			lastError: error instanceof Error ? error.message : 'Unknown error'
		})
		
		return false
	} finally {
		sessionStore.setKey('isInitializing', false)
	}
}

/**
 * Close the current session
 */
export async function closeSession(): Promise<boolean> {
	try {
		// Only try to close if we have a token
		if (!hasCsrfToken()) {
			return true
		}
		
		await client.closeSession()
		clearSession()
		return true
	} catch (error) {
		debugError('Error closing session:', error)
		
		// Always clear the session even if API call fails
		clearSession()
		
		return false
	}
}

// Export session manager as an object for consistency
export const sessionManager = {
	getCSRFToken,
	hasCsrfToken,
	updateCsrfToken,
	clearSession,
	initializeSession,
	closeSession,
	
	// Get CSRF headers for API requests
	getCsrfHeaders(): Record<string, string> {
		const token = getCSRFToken()
		return token ? { 'X-CSRF-Token': token } : {}
	}
}

export default sessionManager

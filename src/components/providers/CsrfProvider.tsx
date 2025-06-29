import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getCsrfTokenFromCookie } from '@/lib/utils/csrfUtils'
import { debugLog } from '@/lib/utils/debug'

interface CsrfContextType {
	csrfToken: string | null
}

const CsrfContext = createContext<CsrfContextType | undefined>(undefined)

/**
 * CsrfProvider component
 *
 * Provides access to the CSRF token from cookies to React components
 */
export const CsrfProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [csrfToken, setCsrfToken] = useState<string | null>(null)

	// Update CSRF token from cookie when component mounts and on interval
	useEffect(() => {
		// Function to get token from cookie
		const updateTokenFromCookie = () => {
			const token = getCsrfTokenFromCookie()
			if (token !== csrfToken) {
				setCsrfToken(token)
				debugLog('CSRF token updated from cookie')
			}
		}

		// Update immediately
		updateTokenFromCookie()

		// Set up interval to check for token changes
		const intervalId = setInterval(updateTokenFromCookie, 60000) // Check every minute

		return () => {
			clearInterval(intervalId)
		}
	}, [csrfToken])

	return <CsrfContext.Provider value={{ csrfToken }}>{children}</CsrfContext.Provider>
}

/**
 * Hook to access the CSRF token
 */
export function useCsrf() {
	const context = useContext(CsrfContext)
	if (!context) {
		throw new Error('useCsrf must be used within a CsrfProvider')
	}
	return context
}

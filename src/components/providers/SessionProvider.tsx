import React, { useEffect } from 'react'
import { apiClient } from '@/lib/api/client'
import { useSessionInitializer } from '@/lib/hooks/useSessionInitializer'
import { useToast } from '@/lib/hooks/useToast'
import { handleError } from '@/lib/utils/errorHandling'

interface SessionProviderProps {
	children: React.ReactNode
}

export const SessionProvider: React.FC<SessionProviderProps> = ({ children }) => {
	const { isInitialized, isInitializing, error, resetSession } = useSessionInitializer()
	const { addToast } = useToast()

	// Show error toast if session initialization fails
	useEffect(() => {
		if (error) {
			addToast({
				title: 'Session Error',
				description: error,
				variant: 'destructive',
				action: {
					label: 'Retry',
					onClick: resetSession
				}
			})
		}
	}, [error, addToast, resetSession])

	// Clean up session on unmount (e.g., when user navigates away)
	useEffect(() => {
		return () => {
			// Only attempt to close the session if it was initialized
			if (isInitialized) {
				apiClient.closeSession().catch((err) => {
					handleError(err, {
						context: { component: 'SessionProvider', action: 'closeSession' },
						silent: true // Don't show to user on page unload
					})
				})
			}
		}
	}, [isInitialized])

	return <>{children}</>
}

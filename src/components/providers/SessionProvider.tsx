import React, { useEffect } from 'react'
import { useCsrf } from './CsrfProvider'
import { apiClient } from '@/lib/api/client'
import { useSessionInitializer } from '@/hooks/useSessionInitializer'
import { useToast } from '@/lib/hooks/useToast'

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const { isInitialized, isInitializing, error } = useSessionInitializer()
	const { addToast } = useToast()

	// Show error toast if session initialization fails
	useEffect(() => {
		if (error) {
			addToast({
				title: 'Session Error',
				description: error,
				variant: 'destructive'
			})
		}
	}, [error, addToast])

	// Clean up session on unmount (e.g., when user navigates away)
	useEffect(() => {
		return () => {
			// Only attempt to close the session if it was initialized
			if (isInitialized) {
				apiClient.closeSession().catch((err) => {
					console.error('Failed to close session:', err)
				})
			}
		}
	}, [isInitialized])

	return <>{children}</>
}

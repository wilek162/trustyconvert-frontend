import React, { useEffect } from 'react'
import { useCsrf } from './CsrfProvider'
import { apiClient } from '@/lib/api/client'

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const { setCsrfToken } = useCsrf()

	useEffect(() => {
		const initializeSession = async () => {
			try {
				const response = await apiClient.initSession()
				setCsrfToken(response.csrf_token)
			} catch (error) {
				console.error('Failed to initialize session:', error)
				// You might want to show a toast notification here
			}
		}

		initializeSession()
	}, [setCsrfToken])

	return <>{children}</>
}

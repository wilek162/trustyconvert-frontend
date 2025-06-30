import React, { useState } from 'react'
import client from '@/lib/api/client'
import { showSuccess, showError, MESSAGE_TEMPLATES } from '@/lib/utils/messageUtils'

interface CloseSessionProps {
	variant?: 'default' | 'minimal' | 'text'
	className?: string
	onSessionClosed?: () => void
}

function CloseSession({ variant = 'default', className = '', onSessionClosed }: CloseSessionProps) {
	const [isClosing, setIsClosing] = useState(false)

	const handleCloseSession = async () => {
		// Confirm with user
		if (
			!window.confirm(
				'Are you sure you want to close this session? All conversion data will be cleared.'
			)
		) {
			return
		}

		try {
			setIsClosing(true)

			// Call API to close session
			const response = await client.closeSession()

			if (response.success) {
				showSuccess(MESSAGE_TEMPLATES.session.created)

				// Call the onSessionClosed callback if provided
				if (onSessionClosed) {
					onSessionClosed()
				}

				// Reload page to start fresh after a short delay
				setTimeout(() => {
					window.location.reload()
				}, 1000)
			} else {
				throw new Error('Failed to close session')
			}
		} catch (error) {
			console.error('Session close error:', error)
			showError(MESSAGE_TEMPLATES.generic.error)
		} finally {
			setIsClosing(false)
		}
	}

	if (variant === 'minimal') {
		return (
			<button
				onClick={handleCloseSession}
				disabled={isClosing}
				className={`text-xs text-muted-foreground hover:text-deepNavy ${className}`}
			>
				{isClosing ? 'Closing session...' : 'Close Session'}
			</button>
		)
	}

	if (variant === 'text') {
		return (
			<button
				onClick={handleCloseSession}
				disabled={isClosing}
				className={`text-sm font-medium text-deepNavy hover:text-trustTeal ${className}`}
			>
				{isClosing ? 'Closing session...' : 'Close Session'}
			</button>
		)
	}

	return (
		<button
			onClick={handleCloseSession}
			disabled={isClosing}
			className={`flex items-center rounded-full border border-warningRed/30 bg-white px-3 py-1.5 text-xs font-medium text-warningRed transition-colors hover:bg-warningRed/10 disabled:opacity-50 ${className}`}
		>
			{isClosing ? (
				<>
					<div className="mr-1.5 h-3 w-3 animate-spin rounded-full border border-warningRed border-t-transparent"></div>
					Closing...
				</>
			) : (
				<>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="mr-1.5 h-3.5 w-3.5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
						/>
					</svg>
					Close Session
				</>
			)}
		</button>
	)
}

export default CloseSession

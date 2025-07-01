/**
 * Offline Banner Component
 *
 * Displays a persistent banner when the user is offline to provide
 * clear feedback about connectivity status.
 */

import React, { useEffect, useState } from 'react'
import { useOnlineStatus } from '@/lib/utils/offlineDetection'

/**
 * Component that shows a banner when the user is offline
 */
export function OfflineBanner(): JSX.Element | null {
	const isOnline = useOnlineStatus()
	const [isVisible, setIsVisible] = useState(false)

	// Add a slight delay before showing/hiding to prevent flashing
	useEffect(() => {
		let timeout: ReturnType<typeof setTimeout>

		if (!isOnline) {
			// Show immediately when offline
			setIsVisible(true)
		} else {
			// Delay hiding when coming back online
			timeout = setTimeout(() => {
				setIsVisible(false)
			}, 1500)
		}

		return () => {
			if (timeout) clearTimeout(timeout)
		}
	}, [isOnline])

	// Don't render anything when online
	if (isOnline && !isVisible) return null

	return (
		<div
			className="fixed left-0 right-0 top-0 z-50 bg-amber-500 px-4 py-2 text-center text-white shadow-md transition-opacity duration-300"
			style={{ opacity: isOnline ? 0.5 : 1 }}
			role="alert"
			aria-live="assertive"
		>
			<div className="flex items-center justify-center gap-2">
				<svg
					className="h-4 w-4"
					fill="currentColor"
					viewBox="0 0 20 20"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						fillRule="evenodd"
						d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
						clipRule="evenodd"
					/>
				</svg>
				<p className="text-sm font-medium">
					{isOnline ? 'Connection restored' : 'You are currently offline'}
				</p>
			</div>
		</div>
	)
}

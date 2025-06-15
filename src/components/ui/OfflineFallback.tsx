/**
 * Offline Fallback Component
 *
 * Displays a user-friendly message when the application is offline,
 * with options to retry operations when back online.
 */

import React, { useState, useEffect } from 'react'
import { useOnlineStatus } from '@/lib/utils/offlineDetection'
import { Button } from '@/components/ui/button'

interface OfflineFallbackProps {
	/**
	 * Message to display when offline
	 */
	message?: string

	/**
	 * Function to call when retry button is clicked
	 */
	onRetry?: () => void

	/**
	 * Children to render when online
	 */
	children: React.ReactNode
}

/**
 * Component that shows a fallback UI when offline and children when online
 */
export function OfflineFallback({
	message = 'You appear to be offline. Some features may not work properly.',
	onRetry,
	children
}: OfflineFallbackProps): JSX.Element {
	const isOnline = useOnlineStatus()
	const [hasAttemptedRetry, setHasAttemptedRetry] = useState(false)

	// Reset retry state when coming back online
	useEffect(() => {
		if (isOnline) {
			setHasAttemptedRetry(false)
		}
	}, [isOnline])

	// Handle retry click
	const handleRetry = (): void => {
		setHasAttemptedRetry(true)
		if (onRetry) {
			onRetry()
		}
	}

	// Show children if online
	if (isOnline) {
		return <>{children}</>
	}

	// Show offline fallback
	return (
		<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
			<div className="flex items-start">
				<div className="flex-shrink-0">
					<svg
						className="h-5 w-5 text-amber-400"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fillRule="evenodd"
							d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
							clipRule="evenodd"
						/>
					</svg>
				</div>
				<div className="ml-3">
					<h3 className="text-sm font-medium">Offline</h3>
					<div className="mt-2 text-sm">
						<p>{message}</p>
					</div>
					<div className="mt-4">
						<Button
							size="sm"
							variant="secondary"
							onClick={handleRetry}
							disabled={hasAttemptedRetry}
						>
							{hasAttemptedRetry ? 'Retrying...' : 'Retry'}
						</Button>
					</div>
				</div>
			</div>
		</div>
	)
}

/**
 * Higher-order component that wraps a component with offline fallback
 *
 * @param Component - Component to wrap
 * @param fallbackProps - Props for the OfflineFallback component
 * @returns Wrapped component with offline fallback
 */
export function withOfflineFallback<P extends object>(
	Component: React.ComponentType<P>,
	fallbackProps?: Omit<OfflineFallbackProps, 'children'>
): React.FC<P> {
	const displayName = Component.displayName || Component.name || 'Component'

	const ComponentWithOfflineFallback: React.FC<P> = (props) => {
		return (
			<OfflineFallback {...fallbackProps}>
				<Component {...props} />
			</OfflineFallback>
		)
	}

	ComponentWithOfflineFallback.displayName = `withOfflineFallback(${displayName})`

	return ComponentWithOfflineFallback
}

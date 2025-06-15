/**
 * Offline Detection Utilities
 *
 * Provides functionality to detect and handle offline/online status changes
 * and implement graceful degradation for offline scenarios.
 */

import { atom } from 'nanostores'
import React from 'react'

/**
 * Store for tracking online/offline status
 */
export const onlineStatusStore = atom<boolean>(
	typeof navigator !== 'undefined' ? navigator.onLine : true
)

/**
 * Initialize offline detection listeners
 * Should be called once during application initialization
 */
export function initOfflineDetection(): void {
	if (typeof window === 'undefined') return

	// Set initial state
	onlineStatusStore.set(navigator.onLine)

	// Add event listeners for online/offline events
	window.addEventListener('online', handleOnline)
	window.addEventListener('offline', handleOffline)

	// Log initial status in development
	if (import.meta.env.DEV) {
		console.log(`Initial network status: ${navigator.onLine ? 'online' : 'offline'}`)
	}
}

/**
 * Clean up offline detection listeners
 * Should be called when the application is unmounted
 */
export function cleanupOfflineDetection(): void {
	if (typeof window === 'undefined') return

	window.removeEventListener('online', handleOnline)
	window.removeEventListener('offline', handleOffline)
}

/**
 * Handle online event
 */
function handleOnline(): void {
	onlineStatusStore.set(true)

	// Dispatch custom event for components that don't use the store
	window.dispatchEvent(new CustomEvent('app:online'))

	if (import.meta.env.DEV) {
		console.log('Network status: online')
	}
}

/**
 * Handle offline event
 */
function handleOffline(): void {
	onlineStatusStore.set(false)

	// Dispatch custom event for components that don't use the store
	window.dispatchEvent(new CustomEvent('app:offline'))

	if (import.meta.env.DEV) {
		console.log('Network status: offline')
	}
}

/**
 * Check if the application is currently online
 * @returns Current online status
 */
export function isOnline(): boolean {
	return typeof navigator !== 'undefined' ? navigator.onLine : true
}

/**
 * React hook to subscribe to online status changes
 * @returns Current online status
 */
export function useOnlineStatus(): boolean {
	if (typeof window === 'undefined') return true

	const [isOnline, setIsOnline] = React.useState(navigator.onLine)

	React.useEffect(() => {
		const handleOnline = () => setIsOnline(true)
		const handleOffline = () => setIsOnline(false)

		window.addEventListener('online', handleOnline)
		window.addEventListener('offline', handleOffline)

		return () => {
			window.removeEventListener('online', handleOnline)
			window.removeEventListener('offline', handleOffline)
		}
	}, [])

	return isOnline
}

/**
 * Astro component to detect offline status and show a banner
 * Usage: <OfflineBanner client:load />
 */
export function OfflineBanner(): JSX.Element | null {
	const isOnline = useOnlineStatus()

	if (isOnline) return null
	return null
}

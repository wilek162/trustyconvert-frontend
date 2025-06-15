/**
 * Application Initialization Module
 *
 * Centralizes application initialization logic for consistent startup
 * across different entry points (SSR, browser, etc.)
 */

import { initializeMonitoring, initializeMocks } from '@/lib/monitoring/init'
import { initGlobalErrorHandlers } from '@/lib/errors/globalErrorHandler'
// Offline detection is temporarily disabled
// import { initOfflineDetection } from '@/lib/utils/offlineDetection'

/**
 * Initialize the application
 * Common initialization code for both server and client
 */
export async function initializeApp(): Promise<void> {
	try {
		// Initialize monitoring first for error tracking
		await initializeMonitoring()

		// Initialize API mocks in development
		if (import.meta.env.DEV) {
			await initializeMocks()
		}

		// Log initialization in development
		if (import.meta.env.DEV) {
			console.log('Application initialized')
		}
	} catch (error) {
		console.error('Failed to initialize application:', error)
	}
}

/**
 * Initialize browser-specific features
 * Only called in the browser environment
 */
export async function initializeBrowser(): Promise<void> {
	if (typeof window === 'undefined') return

	try {
		// Initialize global error handlers
		initGlobalErrorHandlers()

		// Initialize offline detection
		// Offline detection is temporarily disabled
		// initOfflineDetection()

		// Initialize IndexedDB for job persistence
		const { initIndexedDB } = await import('@/lib/stores/upload')
		await initIndexedDB()

		// Initialize session
		const { initSession } = await import('@/lib/api/apiClient')

		// Only initialize session if not already initializing
		const { getInitializing } = await import('@/lib/stores/session')
		if (!getInitializing()) {
			try {
				await initSession()
			} catch (error) {
				console.error('Failed to initialize session:', error)
			}
		}

		// Register service worker if available
		if ('serviceWorker' in navigator && import.meta.env.PROD) {
			window.addEventListener('load', () => {
				navigator.serviceWorker
					.register('/service-worker.js')
					.then((registration) => {
						console.log('ServiceWorker registered with scope:', registration.scope)
					})
					.catch((error) => {
						console.error('ServiceWorker registration failed:', error)
					})
			})
		}

		// Log initialization in development
		if (import.meta.env.DEV) {
			console.log('Browser features initialized')
		}
	} catch (error) {
		console.error('Failed to initialize browser features:', error)
	}
}

// Only auto-initialize in browser environment if not imported by Astro
// This prevents double initialization
if (typeof window !== 'undefined' && !import.meta.env.SSR) {
	// Use requestIdleCallback when available, otherwise use setTimeout
	const scheduleInit = window.requestIdleCallback || setTimeout

	scheduleInit(
		() => {
			initializeApp()
				.then(initializeBrowser)
				.catch((err) => {
					console.error('Failed to auto-initialize app:', err)
				})
		},
		{ timeout: 1000 }
	)
}

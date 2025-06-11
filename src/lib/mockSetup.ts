/**
 * Mock API setup for development environment
 *
 * This module automatically initializes MSW (Mock Service Worker)
 * when running in development mode to simulate API responses.
 */

import { initializeMocks, reportError } from './monitoring'

// Only run in development mode and browser environment
if (import.meta.env.DEV && typeof window !== 'undefined') {
	console.log('🔄 Setting up MSW for API mocking...')

	// Initialize MSW with proper error handling
	void (async () => {
		try {
			await initializeMocks()
			console.log('✅ MSW initialized successfully')
		} catch (error) {
			console.error('❌ Failed to initialize MSW:', error)
			reportError(error instanceof Error ? error : String(error), {
				context: 'mockSetup',
				action: 'initializeMocks'
			})
		}
	})()
}

// Export empty default to satisfy module system
export default {}

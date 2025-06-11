/**
 * MSW (Mock Service Worker) Browser Setup
 *
 * This module configures the MSW worker for intercepting API requests in the browser.
 * Used only in development to simulate backend API responses.
 */

import { setupWorker } from 'msw/browser'

import { handlers } from './handlers'

// Initialize the MSW worker with all API handlers
export const worker = setupWorker(...handlers)

// Export delay utility for simulating network conditions
export const networkConditions = {
	// Apply network delay to simulate real-world conditions
	applyDelay: (min = 100, max = 500) => {
		worker.use((req, res, ctx) => {
			const delay = Math.floor(Math.random() * (max - min + 1)) + min
			return res(ctx.delay(delay))
		})
	},

	// Reset to default behavior
	resetDelay: () => {
		worker.resetHandlers()
		worker.use(...handlers)
	}
}

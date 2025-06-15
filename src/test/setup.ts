import '@testing-library/jest-dom'
import { afterEach, beforeAll, afterAll, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	}))
})

// Mock IntersectionObserver
class MockIntersectionObserver {
	constructor(callback: IntersectionObserverCallback) {
		this.callback = callback
	}

	observe = vi.fn()
	unobserve = vi.fn()
	disconnect = vi.fn()
	callback: IntersectionObserverCallback = () => null
}

Object.defineProperty(window, 'IntersectionObserver', {
	writable: true,
	configurable: true,
	value: MockIntersectionObserver
})

// Clean up after each test
afterEach(() => {
	cleanup()
})

// Set up any global test configuration
beforeAll(() => {
	// Mock console error to make test failures more readable
	vi.spyOn(console, 'error').mockImplementation((...args) => {
		// Allow test debugging but don't pollute test output
		if (process.env.DEBUG === 'true') {
			console.log(...args)
		}
	})
})

// Clean up global mocks
afterAll(() => {
	vi.restoreAllMocks()
})

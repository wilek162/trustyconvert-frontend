/**
 * Debug logging utility for development
 *
 * Features:
 * - Only logs in development mode
 * - Throttles repeated messages
 * - Tracks error recursion
 */

// Track recent messages to prevent spam
const recentMessages = new Map<string, { count: number; timestamp: number }>()
const MESSAGE_THROTTLE_MS = 2000 // Don't repeat the same message more than once per 2 seconds
const MAX_RECURSION_DEPTH = 3 // Maximum recursion depth for error tracking

// Track current error recursion depth
const errorRecursionMap = new Map<string, number>()

// Track call stacks for better recursion detection
const stackTracker = new Map<string, { count: number; lastSeen: number }>()
const STACK_TRACKING_TIMEOUT_MS = 5000 // How long to track a stack before clearing it
const MAX_STACK_ENTRIES = 100 // Maximum number of stack entries to track

/**
 * Check if we're in development mode
 * This must be defined before any functions that use it
 */
export const isDev = (): boolean => {
	// Use a safer check that works during hydration
	try {
		// Check for browser environment
		if (typeof window !== 'undefined') {
			// Check for development mode in browser
			return (
				window.location.hostname === 'localhost' ||
				window.location.hostname === '127.0.0.1' ||
				window.location.port !== ''
			)
		}

		// Check for Node.js environment
		if (typeof process !== 'undefined' && process.env) {
			return process.env.NODE_ENV === 'development'
		}

		// Fallback check
		return false
	} catch (e) {
		// Default to false if we can't determine
		return false
	}
}

/**
 * Get a simplified stack trace for recursion detection
 * @returns Simplified stack trace
 */
function getSimplifiedStack(): string {
	try {
		const err = new Error()
		const stack = err.stack || ''
		// Get just the function names and line numbers to simplify comparison
		return stack
			.split('\n')
			.slice(3, 8) // Skip the first 3 lines (Error, getSimplifiedStack, debugLog/debugError)
			.map((line) => {
				const match = line.match(/at\s+(\S+)\s+\(.*:(\d+):(\d+)\)/)
				if (match) {
					return `${match[1]}:${match[2]}`
				}
				return line.trim()
			})
			.join('|')
	} catch (e) {
		return 'unknown-stack'
	}
}

/**
 * Check if we're in a recursive call pattern
 * @param key Identifier for the call
 * @returns Whether we're in a recursive pattern
 */
function isRecursivePattern(key: string): boolean {
	const stack = getSimplifiedStack()
	const stackKey = `${key}|${stack}`

	const now = Date.now()
	const entry = stackTracker.get(stackKey)

	if (entry) {
		// Update existing entry
		const newCount = entry.count + 1
		stackTracker.set(stackKey, { count: newCount, lastSeen: now })

		// If we've seen this stack more than 3 times in quick succession, it's recursive
		if (newCount >= 3 && now - entry.lastSeen < 1000) {
			return true
		}
	} else {
		// Add new entry
		stackTracker.set(stackKey, { count: 1, lastSeen: now })

		// Clean up old entries
		if (stackTracker.size > MAX_STACK_ENTRIES) {
			let oldestKey = ''
			let oldestTime = Infinity

			for (const [k, v] of stackTracker.entries()) {
				if (v.lastSeen < oldestTime) {
					oldestTime = v.lastSeen
					oldestKey = k
				}
			}

			if (oldestKey) {
				stackTracker.delete(oldestKey)
			}
		}
	}

	return false
}

/**
 * Debug log levels
 */
export enum LogLevel {
	DEBUG = 'debug',
	INFO = 'info',
	WARN = 'warn',
	ERROR = 'error'
}

/**
 * Debug log function
 * Only logs in development mode
 */
export function debugLog(message: string, ...args: any[]): void {
	if (isDev()) {
		console.log(`[DEBUG] ${message}`, ...args)
	}
}

/**
 * Debug error function
 * Only logs in development mode
 */
export function debugError(message: string, ...args: any[]): void {
	if (isDev()) {
		console.error(`[DEBUG] ${message}`, ...args)
	}
}

/**
 * Debug warning function
 * Only logs in development mode
 */
export function debugWarn(message: string, ...args: any[]): void {
	if (isDev()) {
		console.warn(`[DEBUG] ${message}`, ...args)
	}
}

/**
 * Debug info function
 * Only logs in development mode
 */
export function debugInfo(message: string, ...args: any[]): void {
	if (isDev()) {
		console.info(`[DEBUG] ${message}`, ...args)
	}
}

/**
 * Debug session state
 * Logs detailed session information to help diagnose session issues
 *
 * @param sessionManager - The session manager instance
 * @param context - Additional context information
 */
export function debugSessionState(sessionManager: any, context: string = 'general'): void {
	if (!isDev()) return

	try {
		const sessionState = sessionManager.getSessionState()
		const hasCsrfToken = sessionManager.hasCsrfToken()
		const isInitialized = sessionState.sessionInitialized

		console.group(`[SESSION DEBUG] ${context}`)
		console.log('Has CSRF Token:', hasCsrfToken)
		console.log('Session Initialized:', isInitialized)
		console.log('Is Initializing:', sessionState.isInitializing)
		console.log('Last Init Attempt:', sessionState.lastInitAttempt)

		if (sessionState.lastInitError) {
			console.error('Last Init Error:', sessionState.lastInitError)
		}

		console.log('Full Session State:', sessionState)
		console.groupEnd()
	} catch (error) {
		console.error('[SESSION DEBUG] Error getting session state:', error)
	}
}

/**
 * Clean up all debug tracking data
 * This is useful for tests or when you want to reset the debug state
 */
export function clearDebugTracking(): void {
	recentMessages.clear()
	errorRecursionMap.clear()
	stackTracker.clear()
}

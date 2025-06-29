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
 * Debug logging utility for development
 * Usage: debugLog('message', data)
 */
export function debugLog(message: string, data?: any) {
	if (import.meta.env?.MODE === 'development' || process.env.NODE_ENV === 'development') {
		// Create a key for the message
		const messageKey = data ? `${message}-${JSON.stringify(data)}` : message

		// Check if this message was recently logged
		const now = Date.now()
		const recent = recentMessages.get(messageKey)

		if (recent && now - recent.timestamp < MESSAGE_THROTTLE_MS) {
			// Update count but don't log again
			recent.count += 1
			recent.timestamp = now
			return
		}

		// Check for recursive patterns
		if (isRecursivePattern(messageKey)) {
			// If we detect a recursive pattern, throttle more aggressively
			if (!recent || now - recent.timestamp > 10000) {
				console.warn(`[DEBUG] Detected recursive logging pattern for: ${message}`)
			}
			return
		}

		// Log the message
		if (data !== undefined) {
			// eslint-disable-next-line no-console
			console.log(`[DEBUG] ${message}`, data)
		} else {
			// eslint-disable-next-line no-console
			console.log(`[DEBUG] ${message}`)
		}

		// Store this message
		recentMessages.set(messageKey, { count: 1, timestamp: now })

		// Clean up old messages
		if (recentMessages.size > 100) {
			const oldestTime = now - MESSAGE_THROTTLE_MS
			for (const [key, value] of recentMessages.entries()) {
				if (value.timestamp < oldestTime) {
					recentMessages.delete(key)
				}
			}
		}
	}
}

/**
 * Debug error logging utility with recursion tracking
 * Usage: debugError('message', error)
 */
export function debugError(message: string, error?: any) {
	if (import.meta.env?.MODE === 'development' || process.env.NODE_ENV === 'development') {
		// Create an error key based on message and error stack
		const errorStack = error instanceof Error ? error.stack?.slice(0, 100) : String(error)
		const errorKey = `${message}-${errorStack}`

		// Check recursion depth
		const currentDepth = errorRecursionMap.get(errorKey) || 0

		if (currentDepth >= MAX_RECURSION_DEPTH) {
			// We've seen this error too many times in succession
			if (currentDepth === MAX_RECURSION_DEPTH) {
				// Log once that we're suppressing this error
				console.warn(`[DEBUG] Suppressing recursive error: ${message}`)
				// Increment to prevent this warning from showing again
				errorRecursionMap.set(errorKey, currentDepth + 1)
			}
			return
		}

		// Check for recursive patterns using stack tracking
		if (isRecursivePattern(errorKey)) {
			if (currentDepth === 0) {
				console.warn(`[DEBUG] Detected recursive error pattern for: ${message}`)
			}
			errorRecursionMap.set(errorKey, currentDepth + 1)
			return
		}

		// Increment recursion depth
		errorRecursionMap.set(errorKey, currentDepth + 1)

		// Log the error
		// eslint-disable-next-line no-console
		console.error(`[DEBUG ERROR] ${message}`, error)

		// Schedule cleanup of recursion tracking
		setTimeout(() => {
			errorRecursionMap.delete(errorKey)
		}, 5000)
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

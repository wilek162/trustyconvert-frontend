import { atom } from 'nanostores'

interface SessionState {
	csrfToken: string | null
	isInitialized: boolean
	isInitializing: boolean
}

// Create the session store with initial state
export const sessionStore = atom<SessionState>({
	csrfToken: null,
	isInitialized: false,
	isInitializing: false
})

/**
 * Set the CSRF token in the session store
 * @param token The CSRF token from the API
 */
export function setCSRFToken(token: string): void {
	sessionStore.set({
		...sessionStore.get(),
		csrfToken: token,
		isInitialized: true,
		isInitializing: false
	})
}

/**
 * Get the current CSRF token
 * @returns The current CSRF token or null if not set
 */
export function getCSRFToken(): string | null {
	return sessionStore.get().csrfToken
}

/**
 * Get session initialization status
 * @returns Whether the session is currently being initialized
 */
export function getInitializing(): boolean {
	return sessionStore.get().isInitializing
}

/**
 * Get session initialized status
 * @returns Whether the session has been successfully initialized
 */
export function getInitialized(): boolean {
	return sessionStore.get().isInitialized
}

/**
 * Set session initialization status
 * @param status Whether the session is being initialized
 */
export function setInitializing(status: boolean): void {
	sessionStore.set({
		...sessionStore.get(),
		isInitializing: status
	})
}

/**
 * Clear the session store (used during cleanup)
 */
export function clearSession(): void {
	sessionStore.set({
		csrfToken: null,
		isInitialized: false,
		isInitializing: false
	})
}

// Task status type
export type TaskStatus = 'idle' | 'uploading' | 'converting' | 'completed' | 'failed'

// Conversion state store
export interface ConversionState {
	taskId: string | null
	status: TaskStatus
	progress: number
	error?: string
	filename?: string
	targetFormat?: string
	resultUrl?: string
}

// Initial conversion state
const initialConversionState: ConversionState = {
	taskId: null,
	status: 'idle',
	progress: 0
}

// Conversion state store
export const conversionState = atom<ConversionState>(initialConversionState)

// Action to update conversion status
export function updateConversionStatus(status: TaskStatus, data: Partial<ConversionState>) {
	conversionState.set({
		...conversionState.get(),
		status,
		...data
	})
}

// Action to update conversion progress
export function updateConversionProgress(progress: number) {
	conversionState.set({
		...conversionState.get(),
		progress
	})
}

// Action to reset conversion state
export function resetConversion() {
	conversionState.set(initialConversionState)
}

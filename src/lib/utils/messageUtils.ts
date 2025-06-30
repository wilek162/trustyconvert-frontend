/**
 * Message Utilities
 *
 * Centralized utilities for user feedback messages to ensure consistency
 * across the application. This includes toast messages, error messages,
 * and success messages.
 */

import { showToast } from '@/components/providers/ToastListener'

/**
 * Message severity levels
 */
export type MessageSeverity = 'info' | 'success' | 'warning' | 'error'

/**
 * Message display options
 */
export interface MessageOptions {
	/** Duration in milliseconds (0 for no auto-dismiss) */
	duration?: number

	/** Whether to show a close button */
	dismissible?: boolean

	/** Custom message ID for tracking/analytics */
	id?: string
}

/**
 * Default message options by severity
 */
const DEFAULT_OPTIONS: Record<MessageSeverity, MessageOptions> = {
	info: { duration: 5000, dismissible: true },
	success: { duration: 5000, dismissible: true },
	warning: { duration: 8000, dismissible: true },
	error: { duration: 10000, dismissible: true }
}

/**
 * Show a message to the user
 *
 * @param message - Message text
 * @param severity - Message severity
 * @param options - Display options
 */
export function showMessage(
	message: string,
	severity: MessageSeverity = 'info',
	options?: MessageOptions
): void {
	const mergedOptions = {
		...DEFAULT_OPTIONS[severity],
		...options
	}

	// Extract duration and other options
	const { duration, ...otherOptions } = mergedOptions

	// Call showToast with all supported parameters
	showToast(message, severity, duration, otherOptions)
}

/**
 * Show an info message
 */
export function showInfo(message: string, options?: MessageOptions): void {
	showMessage(message, 'info', options)
}

/**
 * Show a success message
 */
export function showSuccess(message: string, options?: MessageOptions): void {
	showMessage(message, 'success', options)
}

/**
 * Show a warning message
 */
export function showWarning(message: string, options?: MessageOptions): void {
	showMessage(message, 'warning', options)
}

/**
 * Show an error message
 */
export function showError(message: string, options?: MessageOptions): void {
	showMessage(message, 'error', options)
}

/**
 * Common message templates for consistent wording
 */
export const MESSAGE_TEMPLATES = {
	// Conversion related messages
	conversion: {
		started: 'Starting file conversion...',
		inProgress: 'Converting your file...',
		complete: 'Conversion completed successfully!',
		failed: 'Conversion failed. Please try again.',
		unsupportedFormat: 'This file format is not supported for conversion.'
	},

	// Upload related messages
	upload: {
		started: 'Uploading your file...',
		inProgress: 'Uploading: {progress}%',
		complete: 'File uploaded successfully!',
		failed: 'Upload failed. Please try again.',
		tooLarge: 'File is too large. Maximum size is {maxSize}.',
		invalidType: 'Invalid file type. Supported types: {supportedTypes}.'
	},

	// Download related messages
	download: {
		started: 'Preparing your download...',
		inProgress: 'Downloading: {progress}%',
		complete: 'Download completed!',
		failed: 'Download failed. Please try again.',
		preparing: 'Preparing your file for download...'
	},

	// Session related messages
	session: {
		expired: 'Your session has expired. Please refresh the page.',
		invalid: 'Invalid session. Please refresh the page.',
		created: 'Session established securely.'
	},

	// Generic messages
	generic: {
		error: 'An error occurred. Please try again.',
		networkError: 'Network error. Please check your connection.',
		serverError: 'Server error. Please try again later.',
		success: 'Operation completed successfully!',
		loading: 'Loading...',
		saving: 'Saving...'
	}
}

/**
 * Format a message template with variables
 *
 * @param template - Message template with {placeholders}
 * @param variables - Variables to replace placeholders
 * @returns Formatted message
 */
export function formatMessage(
	template: string,
	variables: Record<string, string | number>
): string {
	return template.replace(/{(\w+)}/g, (match, key) => {
		return variables[key] !== undefined ? String(variables[key]) : match
	})
}

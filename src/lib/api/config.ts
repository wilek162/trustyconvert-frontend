/**
 * Centralized API configuration for modular, scalable, DRY usage.
 * Uses environment variables for flexibility.
 */

import { RETRY_STRATEGIES } from '@/lib/utils/retry'
import { debugLog } from '@/lib/utils/debug'

// Determine if we're in a secure context
const isSecureContext = typeof window !== 'undefined' && window.isSecureContext

// Check if we're in development mode
const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development'

// Default to HTTPS in production or secure contexts
const defaultProtocol = isSecureContext ? 'https:' : 'http:'

// Get the API URL from environment variables or construct a default one
const getApiUrl = () => {
	// For client-side, use the environment variable or default to production URL
	if (typeof window !== 'undefined') {
		// In development, use a local API URL by default if not specified
		if (isDev) {
			const apiUrl = import.meta.env.PUBLIC_API_URL || 'https://localhost:3000/api'
			debugLog(`Using development API URL: ${apiUrl}`)
			return apiUrl
		}
		return import.meta.env.PUBLIC_API_URL || 'https://api.trustyconvert.com/api'
	}

	// Server-side URL
	const apiUrl = process.env.PUBLIC_API_URL || 'https://api.trustyconvert.com/api'

	// Ensure URL has protocol
	if (!apiUrl.startsWith('http')) {
		return `${defaultProtocol}//${apiUrl}`
	}
	return apiUrl
}

// Get the API domain for CORS settings
const getApiDomain = () => {
	if (typeof window !== 'undefined') {
		try {
			// In development, extract from the API URL to ensure they match
			if (isDev) {
				const url = new URL(import.meta.env.PUBLIC_API_URL || 'https://localhost:3000')
				return url.origin
			}

			return (
				import.meta.env.PUBLIC_API_DOMAIN ||
				new URL(import.meta.env.PUBLIC_API_URL || 'https://api.trustyconvert.com').origin ||
				'https://api.trustyconvert.com'
			)
		} catch (e) {
			// Handle case where URL parsing fails
			return isDev ? 'https://localhost:3000' : 'https://api.trustyconvert.com'
		}
	}

	return process.env.PUBLIC_API_DOMAIN || 'https://api.trustyconvert.com'
}

// Get the frontend domain for CORS settings
const getFrontendDomain = () => {
	if (typeof window !== 'undefined') {
		// In development mode, always use the current window origin
		// This ensures the origin matches exactly what the browser sends
		if (isDev) {
			// Always use the actual window origin in development
			// This handles cases where the port might change due to port conflicts
			debugLog(`Using frontend origin: ${window.location.origin}`)
			return window.location.origin
		}

		// For production, use the configured domain or fallback to window origin
		return (
			import.meta.env.PUBLIC_FRONTEND_DOMAIN ||
			window.location.origin ||
			'https://trustyconvert.com'
		)
	}

	// For server-side rendering, use the environment variable
	// In development, this might not match the actual origin if the port changes
	return process.env.PUBLIC_FRONTEND_DOMAIN || 'https://trustyconvert.com'
}

/**
 * API endpoints according to the API Integration Guide
 */
export const apiEndpoints = {
	sessionInit: '/session/init',
	sessionClose: '/session/close',
	upload: '/upload',
	convert: '/convert',
	jobStatus: '/job_status',
	downloadToken: '/download_token',
	download: '/download',
	formats: '/convert/formats'
}

// Get API URL from environment variables
const API_URL = getApiUrl()

// Default timeout in milliseconds
const DEFAULT_TIMEOUT = parseInt(import.meta.env.API_TIMEOUT || '30000', 10)

// Default retry settings - use the API_REQUEST strategy
const DEFAULT_RETRY_ATTEMPTS = RETRY_STRATEGIES.API_REQUEST.maxRetries

// CSRF token header name - check for environment variable or use default
const CSRF_TOKEN_HEADER = import.meta.env.CSRF_HEADER || 'X-CSRF-Token'

// Get the frontend and API domains for CORS settings
const frontendDomain = getFrontendDomain()
const apiDomain = getApiDomain()

/**
 * API configuration object
 */
export const apiConfig = {
	baseUrl: API_URL,
	apiDomain: apiDomain,
	frontendDomain: frontendDomain,
	timeout: DEFAULT_TIMEOUT,
	retryAttempts: DEFAULT_RETRY_ATTEMPTS,
	csrfTokenHeader: CSRF_TOKEN_HEADER,
	endpoints: apiEndpoints,
	isDevelopment: isDev,
	cors: {
		credentials: true,
		allowedOrigins: [frontendDomain],
		allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Requested-With'],
		exposedHeaders: ['X-CSRF-Token'],
		maxAge: 86400 // 24 hours
	}
}

/**
 * Get a download URL from a download token
 *
 * @param token - Download token
 * @returns Download URL
 */
export function getDownloadUrl(token: string): string {
	return `${API_URL}${apiEndpoints.download}?token=${encodeURIComponent(token)}`
}

export default apiConfig

/**
 * Centralized API configuration for modular, scalable, DRY usage.
 * Uses environment variables for flexibility.
 */

// Determine if we're in a secure context
const isSecureContext = typeof window !== 'undefined' && window.isSecureContext

// Default to HTTPS in production or secure contexts
const defaultProtocol = isSecureContext ? 'https:' : 'http:'

// Get the API URL from environment variables or construct a default one
const getApiUrl = () => {
	// For client-side, use the environment variable or default to production URL
	if (typeof window !== 'undefined') {
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
			return (
				import.meta.env.PUBLIC_API_DOMAIN ||
				new URL(import.meta.env.PUBLIC_API_URL || 'https://api.trustyconvert.com').origin ||
				'https://api.trustyconvert.com'
			)
		} catch (e) {
			// Handle case where URL parsing fails
			return 'https://api.trustyconvert.com'
		}
	}

	return process.env.PUBLIC_API_DOMAIN || 'https://api.trustyconvert.com'
}

// Get the frontend domain for CORS settings
const getFrontendDomain = () => {
	if (typeof window !== 'undefined') {
		return (
			import.meta.env.PUBLIC_FRONTEND_DOMAIN ||
			window.location.origin ||
			'https://trustyconvert.com'
		)
	}

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

export const apiConfig = {
	baseUrl: getApiUrl(),
	apiDomain: getApiDomain(),
	frontendDomain: getFrontendDomain(),
	timeout: Number(import.meta.env.API_TIMEOUT || 30000), // ms
	retryAttempts: Number(import.meta.env.API_RETRY_ATTEMPTS || 3),
	csrfTokenHeader: 'X-CSRF-Token',
	endpoints: apiEndpoints,
	cors: {
		credentials: true,
		allowedOrigins: [getFrontendDomain()],
		allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
		allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
		exposedHeaders: ['X-CSRF-Token'],
		maxAge: 86400 // 24 hours
	}
}

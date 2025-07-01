/**
 * Security configuration for TrustyConvert
 * Contains settings for cookies, CSRF protection, and other security measures
 */

import { SECURITY } from './constants'

// Determine if we're in a secure context
const isSecureContext = typeof window !== 'undefined' && window.isSecureContext

// Cookie configuration
export const cookieConfig = {
	// HTTP-only cookies can't be accessed by JavaScript
	httpOnly: true,

	// Secure cookies are only sent over HTTPS
	secure: true,

	// SameSite policy helps prevent CSRF attacks
	// 'none' allows cross-origin requests (required for separate frontend/backend domains)
	// but requires 'secure: true'
	sameSite: 'none' as 'none',

	// Path for the cookie
	path: '/',

	// Domain for the cookie (defaults to current domain)
	// Only set this if your frontend and API are on subdomains of the same domain
	// domain: '.trustyconvert.com', // Uncomment and set if needed

	// Max age in seconds (24 hours)
	maxAge: 24 * 60 * 60
}

// CSRF protection configuration
export const csrfConfig = {
	headerName: SECURITY.CSRF_HEADER,
	cookieName: 'csrf',

	// Regenerate token after this many seconds (4 hours)
	regenerateAfter: 4 * 60 * 60
}

// Content Security Policy settings
export const cspConfig = {
	// Add your CSP directives here
	directives: {
		'default-src': ["'self'"],
		'script-src': ["'self'"],
		'style-src': ["'self'", "'unsafe-inline'"],
		'img-src': ["'self'", 'data:'],
		'font-src': ["'self'"],
		'connect-src': ["'self'", 'https://api.trustyconvert.com'],
		'frame-src': ["'none'"],
		'object-src': ["'none'"]
	}
}

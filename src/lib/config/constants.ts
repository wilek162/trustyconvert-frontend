/**
 * Application constants and configuration values
 * Centralizing these values makes it easier to modify them across the application
 */

// API Configuration
export const API = {
	BASE_URL: import.meta.env.PUBLIC_API_URL || '/api',
	TIMEOUT: 30000, // 30 seconds
	MAX_RETRIES: 2,
	POLLING_INTERVAL: 2000, // 2 seconds
	ENDPOINTS: {
		SESSION_INIT: '/session',
		SESSION_CLOSE: '/session/close',
		UPLOAD: '/upload',
		CONVERT: '/convert',
		JOB_STATUS: '/job_status',
		DOWNLOAD_TOKEN: '/download_token',
		DOWNLOAD: '/download'
	}
}

// File Upload Constraints
export const FILE_UPLOAD = {
	MAX_SIZE: 100 * 1024 * 1024, // 100MB (increased from 50MB)
	CHUNK_SIZE: 10 * 1024 * 1024, // 10MB chunks for resumable uploads (increased from 5MB)
	// File size categories for adaptive handling
	SIZE_CATEGORIES: {
		SMALL: 5 * 1024 * 1024, // 5MB
		MEDIUM: 20 * 1024 * 1024, // 20MB
		LARGE: 50 * 1024 * 1024, // 50MB
		VERY_LARGE: 100 * 1024 * 1024, // 100MB
	},
	SUPPORTED_FORMATS: {
		DOCUMENT: ['pdf', 'docx', 'doc', 'txt', 'rtf', 'odt'],
		IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
		SPREADSHEET: ['xlsx', 'xls', 'csv'],
		PRESENTATION: ['pptx', 'ppt']
	},
	MIME_TYPES: {
		DOCUMENT: [
			'application/pdf',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			'application/msword',
			'text/plain',
			'application/rtf',
			'application/vnd.oasis.opendocument.text'
		],
		IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
		SPREADSHEET: [
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'application/vnd.ms-excel',
			'text/csv'
		],
		PRESENTATION: [
			'application/vnd.openxmlformats-officedocument.presentationml.presentation',
			'application/vnd.ms-powerpoint'
		]
	}
}

// Session Configuration
export const SESSION = {
	DEFAULT_TTL: 24 * 60 * 60 * 1000, // 24 hours
	REFRESH_THRESHOLD: 30 * 60 * 1000 // Refresh if less than 30 minutes left
}

// Security Configuration
export const SECURITY = {
	CSRF_HEADER: 'X-CSRF-Token',
	SESSION_COOKIE: 'trusty_session'
}
// UI Configuration
export const UI = {
	TOAST_DURATION: 5000,
	MAX_TOASTS: 3,
	THEME: {
		PRIMARY_COLOR: 'trustTeal',
		ERROR_COLOR: 'warningRed',
		SUCCESS_COLOR: 'successGreen'
	}
}

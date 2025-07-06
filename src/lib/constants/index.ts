/**
 * Application constants
 */

// API Configuration
export const API_CONFIG = {
	BASE_URL: process.env.PUBLIC_API_URL || 'http://localhost:3000/api',
	TIMEOUT: 30000, // 30 seconds
	MAX_RETRIES: 3,
	RETRY_DELAY: 1000, // 1 second
	UPLOAD_CHUNK_SIZE: 1024 * 1024, // 1MB
	MAX_FILE_SIZE: 15 * 1024 * 1024, // 15MB
	SUPPORTED_FORMATS: {
		IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
		DOCUMENT: [
			'application/pdf',
			'application/msword',
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
		],
		SPREADSHEET: [
			'application/vnd.ms-excel',
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		],
		PRESENTATION: [
			'application/vnd.ms-powerpoint',
			'application/vnd.openxmlformats-officedocument.presentationml.presentation'
		]
	}
} as const

// Storage Configuration
export const STORAGE_CONFIG = {
	PREFIX: 'trustyconvert_',
	EXPIRATION: {
		LOCAL: 24 * 60 * 60 * 1000, // 24 hours
		SESSION: 30 * 60 * 1000 // 30 minutes
	},
	MAX_LOGS: 1000
} as const

// Analytics Configuration
export const ANALYTICS_CONFIG = {
	ENABLED: process.env.NODE_ENV === 'production',
	SAMPLE_RATE: 1.0,
	EVENTS: {
		CONVERSION: {
			START: 'conversion_start',
			COMPLETE: 'conversion_complete',
			ERROR: 'conversion_error'
		},
		DOWNLOAD: {
			START: 'download_start',
			COMPLETE: 'download_complete',
			ERROR: 'download_error'
		},
		UPLOAD: {
			START: 'upload_start',
			COMPLETE: 'upload_complete',
			ERROR: 'upload_error'
		}
	}
} as const

// Performance Configuration
export const PERFORMANCE_CONFIG = {
	THRESHOLDS: {
		LCP: 2500, // 2.5 seconds
		FID: 100, // 100 milliseconds
		CLS: 0.1
	},
	METRICS: {
		LCP: 'largest-contentful-paint',
		FID: 'first-input-delay',
		CLS: 'cumulative-layout-shift'
	}
} as const

// Error Messages
export const ERROR_MESSAGES = {
	NETWORK: {
		OFFLINE: 'You are currently offline. Please check your internet connection.',
		TIMEOUT: 'The request timed out. Please try again.',
		SERVER_ERROR: 'An error occurred on the server. Please try again later.'
	},
	VALIDATION: {
		REQUIRED: 'This field is required.',
		INVALID_EMAIL: 'Please enter a valid email address.',
		INVALID_FILE_TYPE: 'Invalid file type. Please upload a supported file format.',
		FILE_TOO_LARGE: 'File size exceeds the maximum limit of 15MB.'
	},
	CONVERSION: {
		FAILED: 'File conversion failed. Please try again.',
		CANCELLED: 'File conversion was cancelled.',
		TIMEOUT: 'File conversion timed out. Please try again.'
	},
	DOWNLOAD: {
		FAILED: 'File download failed. Please try again.',
		CANCELLED: 'File download was cancelled.',
		TIMEOUT: 'File download timed out. Please try again.'
	}
} as const

// UI Configuration
export const UI_CONFIG = {
	THEME: {
		PRIMARY: '#007AFF',
		SECONDARY: '#5856D6',
		SUCCESS: '#34C759',
		WARNING: '#FF9500',
		ERROR: '#FF3B30',
		INFO: '#5856D6'
	},
	BREAKPOINTS: {
		SM: 640,
		MD: 768,
		LG: 1024,
		XL: 1280,
		'2XL': 1536
	},
	ANIMATION: {
		DURATION: {
			FAST: 150,
			NORMAL: 300,
			SLOW: 500
		},
		EASING: {
			DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
			LINEAR: 'linear',
			IN: 'cubic-bezier(0.4, 0, 1, 1)',
			OUT: 'cubic-bezier(0, 0, 0.2, 1)',
			IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)'
		}
	}
} as const

// SEO Configuration
export const SEO_CONFIG = {
	DEFAULT_TITLE: 'TrustyConvert - Fast and Secure File Conversion',
	DEFAULT_DESCRIPTION:
		'Convert your files quickly and securely with TrustyConvert. Support for various file formats including images, documents, spreadsheets, and presentations.',
	DEFAULT_IMAGE: '/images/og-image.jpg',
	SITE_URL: process.env.PUBLIC_SITE_URL || 'http://localhost:3000',
	TWITTER_HANDLE: '@trustyconvert'
} as const

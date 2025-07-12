// Use message templates consistently across the application
// Standardize on MESSAGE_TEMPLATES from src/lib/constants/messages.ts
// Remove duplicate implementations in useToast.ts
// Update ToastProvider.tsx to use single MESSAGE_TEMPLATES
/**
 * Centralized message templates for consistent user feedback.
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
		saving: 'Saving...',
		clientError: 'Something went wrong in the application. Please try again.'
	}
};

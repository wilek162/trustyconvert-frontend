/**
 * Mock Data Store
 *
 * This module provides a centralized store for mock data used in API handlers.
 * It includes utilities for working with the mock data and simulating various scenarios.
 */

import { v4 as uuidv4 } from 'uuid'
import type { JobStatus, ConversionFormat } from '../lib/types/api'

/**
 * Mock session data structure
 */
interface MockSession {
	csrf_token: string
	created_at: string
	expires_at: string
}

/**
 * Mock job data structure
 */
interface MockJob {
	job_id: string
	original_filename: string
	target_format?: string
	file_size: number
	mime_type: string
	status: JobStatus
	task_id?: string
	created_at: string
	updated_at?: string
	completed_at?: string
	error_message?: string
	progress?: number
	current_step?: string
}

/**
 * Mock download token data structure
 */
interface MockDownloadToken {
	token: string
	job_id: string
	session_id: string
	file_path: string
	expires_at: string
}

// In-memory storage for mock data
const mockSessionStore = new Map<string, MockSession>()
const mockJobStore = new Map<string, MockJob>()
const mockDownloadTokens = new Map<string, MockDownloadToken>()

/**
 * Mock supported conversion formats
 */
export const SUPPORTED_FORMATS: ConversionFormat[] = [
	{
		id: 'document',
		name: 'Document Conversion',
		description: 'Convert between document formats like DOCX, PDF, and TXT',
		input_formats: ['docx', 'doc', 'pdf', 'rtf', 'txt', 'odt'],
		output_formats: ['pdf', 'docx', 'txt', 'odt'],
		icon: 'file-text'
	},
	{
		id: 'image',
		name: 'Image Conversion',
		description: 'Convert between image formats like JPEG, PNG, and WebP',
		input_formats: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'],
		output_formats: ['jpg', 'png', 'webp', 'gif', 'tiff'],
		icon: 'image'
	},
	{
		id: 'spreadsheet',
		name: 'Spreadsheet Conversion',
		description: 'Convert between spreadsheet formats like XLSX, CSV, and ODS',
		input_formats: ['xlsx', 'xls', 'csv', 'ods'],
		output_formats: ['xlsx', 'csv', 'ods', 'pdf'],
		icon: 'table'
	},
	{
		id: 'presentation',
		name: 'Presentation Conversion',
		description: 'Convert between presentation formats like PPTX and PDF',
		input_formats: ['pptx', 'ppt', 'odp'],
		output_formats: ['pptx', 'pdf', 'odp'],
		icon: 'presentation'
	},
	{
		id: 'archive',
		name: 'Archive Conversion',
		description: 'Convert between archive formats like ZIP, RAR, and TAR',
		input_formats: ['zip', 'rar', 'tar', '7z', 'gz'],
		output_formats: ['zip', 'tar', 'gz'],
		icon: 'archive'
	}
]

/**
 * Session management utilities
 */
export const sessionStore = {
	/**
	 * Create a new session
	 */
	createSession(): { sessionId: string; csrfToken: string } {
		const sessionId = uuidv4()
		const csrfToken = uuidv4()

		// Create session with 24h expiry
		const expiryDate = new Date()
		expiryDate.setHours(expiryDate.getHours() + 24)

		mockSessionStore.set(sessionId, {
			csrf_token: csrfToken,
			created_at: new Date().toISOString(),
			expires_at: expiryDate.toISOString()
		})

		return { sessionId, csrfToken }
	},

	/**
	 * Get session by ID
	 */
	getSession(sessionId: string): MockSession | undefined {
		return mockSessionStore.get(sessionId)
	},

	/**
	 * Validate CSRF token for a session
	 */
	validateCsrfToken(sessionId: string, csrfToken: string): boolean {
		const session = mockSessionStore.get(sessionId)
		return session?.csrf_token === csrfToken
	},

	/**
	 * Delete a session
	 */
	deleteSession(sessionId: string): boolean {
		return mockSessionStore.delete(sessionId)
	},

	/**
	 * Get session ID from cookie
	 */
	getSessionIdFromCookies(): string | null {
		const cookies = document.cookie.split(';')
		const sessionCookie = cookies.find((cookie) => cookie.trim().startsWith('session_id='))

		if (!sessionCookie) {
			return null
		}

		return sessionCookie.trim().split('=')[1]
	}
}

/**
 * Job management utilities
 */
export const jobStore = {
	/**
	 * Create a new job
	 */
	createJob(jobId: string, file: File): MockJob {
		const job = {
			job_id: jobId,
			original_filename: file.name,
			file_size: file.size,
			mime_type: file.type,
			status: 'uploaded' as JobStatus,
			created_at: new Date().toISOString()
		}

		mockJobStore.set(jobId, job)
		return job
	},

	/**
	 * Get job by ID
	 */
	getJob(jobId: string): MockJob | undefined {
		return mockJobStore.get(jobId)
	},

	/**
	 * Update job status
	 */
	updateJobStatus(
		jobId: string,
		status: JobStatus,
		data: Partial<MockJob> = {}
	): MockJob | undefined {
		const job = mockJobStore.get(jobId)

		if (!job) {
			return undefined
		}

		const updatedJob = {
			...job,
			status,
			updated_at: new Date().toISOString(),
			...data
		}

		mockJobStore.set(jobId, updatedJob)
		return updatedJob
	},

	/**
	 * Start conversion job
	 */
	startConversion(
		jobId: string,
		targetFormat: string
	): { job: MockJob; taskId: string } | undefined {
		const job = mockJobStore.get(jobId)

		if (!job) {
			return undefined
		}

		const taskId = uuidv4()
		const updatedJob = {
			...job,
			status: 'processing' as JobStatus,
			task_id: taskId,
			target_format: targetFormat,
			updated_at: new Date().toISOString(),
			progress: 0
		}

		mockJobStore.set(jobId, updatedJob)
		return { job: updatedJob, taskId }
	},

	/**
	 * Complete conversion job
	 */
	completeJob(jobId: string): MockJob | undefined {
		const job = mockJobStore.get(jobId)

		if (!job) {
			return undefined
		}

		const updatedJob = {
			...job,
			status: 'completed' as JobStatus,
			completed_at: new Date().toISOString(),
			progress: 100
		}

		mockJobStore.set(jobId, updatedJob)
		return updatedJob
	},

	/**
	 * Fail conversion job
	 */
	failJob(jobId: string, errorMessage: string): MockJob | undefined {
		const job = mockJobStore.get(jobId)

		if (!job) {
			return undefined
		}

		const updatedJob = {
			...job,
			status: 'failed' as JobStatus,
			error_message: errorMessage,
			updated_at: new Date().toISOString()
		}

		mockJobStore.set(jobId, updatedJob)
		return updatedJob
	},

	/**
	 * Get all jobs
	 */
	getAllJobs(): MockJob[] {
		return Array.from(mockJobStore.values())
	},

	/**
	 * Delete a job
	 */
	deleteJob(jobId: string): boolean {
		return mockJobStore.delete(jobId)
	},

	/**
	 * Update job progress
	 */
	updateProgress(jobId: string, progress: number, currentStep?: string): MockJob | undefined {
		const job = mockJobStore.get(jobId)

		if (!job) {
			return undefined
		}

		const updatedJob = {
			...job,
			progress: Math.min(Math.max(0, progress), 100),
			current_step: currentStep,
			updated_at: new Date().toISOString()
		}

		mockJobStore.set(jobId, updatedJob)
		return updatedJob
	}
}

/**
 * Download token management utilities
 */
export const downloadTokenStore = {
	/**
	 * Create a new download token
	 */
	createToken(jobId: string, sessionId: string): { token: string; expiresAt: string } | undefined {
		const job = mockJobStore.get(jobId)

		if (!job || job.status !== 'completed') {
			return undefined
		}

		const token = uuidv4()

		// Create token with 1h expiry
		const expiryDate = new Date()
		expiryDate.setHours(expiryDate.getHours() + 1)
		const expiresAt = expiryDate.toISOString()

		mockDownloadTokens.set(token, {
			token,
			job_id: jobId,
			session_id: sessionId,
			file_path: `/converted/${jobId}${getOutputExtension(job)}`,
			expires_at: expiresAt
		})

		return { token, expiresAt }
	},

	/**
	 * Get download token data
	 */
	getToken(token: string): MockDownloadToken | undefined {
		return mockDownloadTokens.get(token)
	},

	/**
	 * Delete a token
	 */
	deleteToken(token: string): boolean {
		return mockDownloadTokens.delete(token)
	}
}

/**
 * Helper function to determine output file extension based on target format
 */
function getOutputExtension(job: MockJob): string {
	if (!job.target_format) {
		return ''
	}

	// Add period to extension if needed
	return job.target_format.startsWith('.') ? job.target_format : `.${job.target_format}`
}

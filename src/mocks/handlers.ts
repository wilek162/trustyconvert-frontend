/**
 * API Mock Handlers
 *
 * Defines mock handlers for all API endpoints to simulate backend behavior in development.
 * Uses MSW (Mock Service Worker) to intercept requests and return simulated responses.
 */

import { http, HttpResponse, type HttpHandler } from 'msw'
import { v4 as uuidv4 } from 'uuid'
import { sessionStore, jobStore, downloadTokenStore, SUPPORTED_FORMATS } from './mockData'

/**
 * Common error response helper
 */
function errorResponse(status: number, error: string, message: string) {
	return new HttpResponse(
		JSON.stringify({
			success: false,
			data: {
				error,
				message
			}
		}),
		{ status }
	)
}

/**
 * Validate CSRF token from request
 */
function validateCsrf(request: Request): boolean | Response {
	const sessionId = sessionStore.getSessionIdFromCookies()
	const csrfToken = request.headers.get('X-CSRF-Token')

	if (!sessionId) {
		return errorResponse(401, 'SessionExpired', 'Session not found or expired')
	}

	if (!csrfToken) {
		return errorResponse(403, 'InvalidCSRFToken', 'Missing CSRF token')
	}

	if (!sessionStore.validateCsrfToken(sessionId, csrfToken)) {
		return errorResponse(403, 'InvalidCSRFToken', 'Invalid CSRF token')
	}

	return true
}

/**
 * Mock API handlers
 */
export const handlers: HttpHandler[] = [
	// Get supported formats
	http.get('/api/formats', () => {
		return HttpResponse.json({
			success: true,
			data: {
				formats: SUPPORTED_FORMATS
			}
		})
	}),

	// Session initialization
	http.get('/api/session/init', () => {
		// Create a new session
		const { sessionId, csrfToken } = sessionStore.createSession()

		// Set session cookie
		document.cookie = `session_id=${sessionId}; path=/; secure; samesite=strict; max-age=86400`

		return HttpResponse.json({
			success: true,
			data: {
				csrf_token: csrfToken,
				session_id: sessionId,
				expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
			}
		})
	}),

	// Session close
	http.post('/api/session/close', ({ request }) => {
		// Validate CSRF token
		const validation = validateCsrf(request)
		if (validation !== true) {
			return validation
		}

		const sessionId = sessionStore.getSessionIdFromCookies()
		if (!sessionId) {
			return errorResponse(404, 'SessionNotFound', 'Session not found')
		}

		// Delete session
		sessionStore.deleteSession(sessionId)

		// Clear session cookie
		document.cookie = 'session_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'

		return HttpResponse.json({
			success: true,
			data: {
				message: 'Session closed successfully',
				session_id: sessionId
			}
		})
	}),

	// File upload
	http.post('/api/upload', async ({ request }) => {
		try {
			// Validate CSRF token
			const validation = validateCsrf(request)
			if (validation !== true) {
				return validation
			}

			const formData = await request.formData()
			const file = formData.get('file') as File
			const jobId = formData.get('job_id') as string

			if (!file || !jobId) {
				return errorResponse(400, 'ValidationError', 'Missing file or job_id')
			}

			// Create job
			const job = jobStore.createJob(jobId, file)

			// Return successful response
			return HttpResponse.json({
				success: true,
				data: {
					job_id: job.job_id,
					status: job.status,
					original_filename: job.original_filename,
					file_size: job.file_size,
					mime_type: job.mime_type
				}
			})
		} catch (error) {
			return errorResponse(500, 'ServerError', 'Error processing upload')
		}
	}),

	// Start conversion
	http.post('/api/convert', async ({ request }) => {
		try {
			// Validate CSRF token
			const validation = validateCsrf(request)
			if (validation !== true) {
				return validation
			}

			const data = await request.json()
			const { job_id, target_format } = data

			if (!job_id || !target_format) {
				return errorResponse(400, 'ValidationError', 'Missing job_id or target_format')
			}

			// Start conversion
			const result = jobStore.startConversion(job_id, target_format)

			if (!result) {
				return errorResponse(404, 'NotFound', 'Job not found')
			}

			// Schedule progress updates (simulating async processing)
			simulateJobProgress(job_id)

			// Return successful response
			return HttpResponse.json({
				success: true,
				data: {
					job_id,
					task_id: result.job.task_id,
					status: result.job.status,
					original_filename: result.job.original_filename,
					target_format
				}
			})
		} catch (error) {
			return errorResponse(500, 'ServerError', 'Error starting conversion')
		}
	}),

	// Get job status
	http.get('/api/job_status', ({ request }) => {
		try {
			// Get job_id from query params
			const url = new URL(request.url)
			const job_id = url.searchParams.get('job_id')

			if (!job_id) {
				return errorResponse(400, 'ValidationError', 'Missing job_id parameter')
			}

			// Get job
			const job = jobStore.getJob(job_id)

			if (!job) {
				return errorResponse(404, 'NotFound', 'Job not found')
			}

			// Return job status
			return HttpResponse.json({
				success: true,
				data: {
					job_id: job.job_id,
					status: job.status,
					progress: job.progress,
					current_step: job.current_step,
					error_message: job.error_message,
					completed_at: job.completed_at,
					started_at: job.created_at,
					estimated_time_remaining: calculateEstimatedTimeRemaining(job)
				}
			})
		} catch (error) {
			return errorResponse(500, 'ServerError', 'Error getting job status')
		}
	}),

	// Get download token
	http.post('/api/download_token', async ({ request }) => {
		try {
			// Validate CSRF token
			const validation = validateCsrf(request)
			if (validation !== true) {
				return validation
			}

			const data = await request.json()
			const { job_id } = data

			if (!job_id) {
				return errorResponse(400, 'ValidationError', 'Missing job_id')
			}

			// Get job
			const job = jobStore.getJob(job_id)

			if (!job) {
				return errorResponse(404, 'NotFound', 'Job not found')
			}

			if (job.status !== 'completed') {
				return errorResponse(400, 'ValidationError', 'Job is not completed')
			}

			// Create download token
			const sessionId = sessionStore.getSessionIdFromCookies() || ''
			const result = downloadTokenStore.createToken(job_id, sessionId)

			if (!result) {
				return errorResponse(500, 'ServerError', 'Failed to create download token')
			}

			// Return download token
			return HttpResponse.json({
				success: true,
				data: {
					download_token: result.token,
					expires_at: result.expiresAt
				}
			})
		} catch (error) {
			return errorResponse(500, 'ServerError', 'Error creating download token')
		}
	}),

	// Download file
	http.get('/api/download', ({ request }) => {
		try {
			// Get token from query params
			const url = new URL(request.url)
			const token = url.searchParams.get('token')

			if (!token) {
				return errorResponse(400, 'ValidationError', 'Missing token parameter')
			}

			// Get token data
			const tokenData = downloadTokenStore.getToken(token)

			if (!tokenData) {
				return errorResponse(404, 'NotFound', 'Download token not found or expired')
			}

			// Check if token is expired
			if (new Date(tokenData.expires_at) < new Date()) {
				downloadTokenStore.deleteToken(token)
				return errorResponse(401, 'TokenExpired', 'Download token has expired')
			}

			// In a real implementation, this would serve the file
			// For now, just return a mock file response
			const job = jobStore.getJob(tokenData.job_id)

			if (!job) {
				return errorResponse(404, 'NotFound', 'Job not found')
			}

			// Return a mock file (empty blob with correct name)
			return new HttpResponse(
				new Blob([`This is a mock converted file for ${job.original_filename}`], {
					type: 'application/octet-stream'
				}),
				{
					status: 200,
					headers: {
						'Content-Disposition': `attachment; filename="${getConvertedFilename(job)}"`,
						'Content-Type': 'application/octet-stream'
					}
				}
			)
		} catch (error) {
			return errorResponse(500, 'ServerError', 'Error downloading file')
		}
	})
]

/**
 * Simulate job progress updates
 */
function simulateJobProgress(jobId: string): void {
	let progress = 0
	const steps = [
		'Validating file',
		'Analyzing content',
		'Converting format',
		'Optimizing output',
		'Finalizing'
	]

	// Update progress every 0.5-1.5 seconds
	const interval = setInterval(
		() => {
			const job = jobStore.getJob(jobId)

			// Stop if job no longer exists or is no longer processing
			if (!job || job.status !== 'processing') {
				clearInterval(interval)
				return
			}

			// Calculate next progress value (non-linear to simulate real-world processing)
			const increment = Math.floor(Math.random() * 10) + 1
			progress = Math.min(progress + increment, 100)

			// Determine current step based on progress
			const stepIndex = Math.min(Math.floor(progress / 20), steps.length - 1)
			const currentStep = steps[stepIndex]

			// Update job
			jobStore.updateProgress(jobId, progress, currentStep)

			// Randomly decide if job completes or fails
			if (progress >= 100) {
				clearInterval(interval)

				const random = Math.random()
				if (random < 0.9) {
					// 90% chance of success
					jobStore.completeJob(jobId)
				} else {
					// 10% chance of failure with random error
					const errors = [
						'File is corrupted or invalid',
						'Unsupported file content',
						'Conversion engine error',
						'Resource limit exceeded'
					]
					const errorMessage = errors[Math.floor(Math.random() * errors.length)]
					jobStore.failJob(jobId, errorMessage)
				}
			}
		},
		Math.random() * 1000 + 500
	)
}

/**
 * Calculate estimated time remaining based on progress
 */
function calculateEstimatedTimeRemaining(job: any): number | undefined {
	if (!job.progress || job.status !== 'processing') {
		return undefined
	}

	// Simple calculation - assume total time is roughly 30 seconds
	// and we've used up progress% of that time
	const totalEstimatedTime = 30 // seconds
	const remainingPercentage = (100 - job.progress) / 100
	const estimatedSecondsRemaining = Math.ceil(totalEstimatedTime * remainingPercentage)

	return estimatedSecondsRemaining
}

/**
 * Generate converted filename based on original filename and target format
 */
function getConvertedFilename(job: any): string {
	if (!job.original_filename || !job.target_format) {
		return `converted-${job.job_id}.file`
	}

	// Remove original extension if present
	const baseName = job.original_filename.includes('.')
		? job.original_filename.split('.').slice(0, -1).join('.')
		: job.original_filename

	// Add new extension
	const extension = job.target_format.startsWith('.') ? job.target_format : `.${job.target_format}`

	return `${baseName}${extension}`
}

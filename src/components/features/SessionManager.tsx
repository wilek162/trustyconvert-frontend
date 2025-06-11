import React, { useState, useEffect } from 'react'
import { closeSession } from '@/lib/api/apiClient'
import { getInitializing, getCSRFToken, clearSession } from '@/lib/stores/session'
import { getAllJobs } from '@/lib/stores/upload'
import type { FileUploadData } from '@/lib/stores/upload'

interface SessionManagerProps {
	onSessionClosed?: () => void
	onSessionError?: (error: string) => void
	showExportOption?: boolean
}

export function SessionManager({
	onSessionClosed,
	onSessionError,
	showExportOption = true
}: SessionManagerProps) {
	const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null)
	const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
	const [isClosing, setIsClosing] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [jobCount, setJobCount] = useState(0)

	// Initialize session time tracking
	useEffect(() => {
		const csrfToken = getCSRFToken()
		if (csrfToken) {
			// If we have a CSRF token, session is active
			// For demo purposes, we'll use the current time as session start
			// In a real app, you would track this from when the session was actually created
			setSessionStartTime(new Date())
		}

		// Count jobs in store
		const jobs = getAllJobs()
		setJobCount(jobs.length)
	}, [])

	// Update time remaining
	useEffect(() => {
		if (!sessionStartTime) return

		// Session TTL is 24 hours (86400 seconds)
		const SESSION_TTL = 24 * 60 * 60

		const updateTimeRemaining = () => {
			const now = new Date()
			const elapsedSeconds = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000)
			const remaining = Math.max(0, SESSION_TTL - elapsedSeconds)
			setTimeRemaining(remaining)
		}

		// Update immediately
		updateTimeRemaining()

		// Then update every minute
		const timerId = setInterval(updateTimeRemaining, 60 * 1000)

		return () => clearInterval(timerId)
	}, [sessionStartTime])

	// Format time remaining
	const formatTimeRemaining = (seconds: number): string => {
		const hours = Math.floor(seconds / 3600)
		const minutes = Math.floor((seconds % 3600) / 60)

		if (hours > 0) {
			return `${hours}h ${minutes}m`
		} else {
			return `${minutes}m`
		}
	}

	// Handle session cleanup
	const handleCloseSession = async () => {
		// Confirm with user
		if (
			!window.confirm(
				'Are you sure you want to close this session? All conversion data will be cleared.'
			)
		) {
			return
		}

		try {
			setIsClosing(true)
			setError(null)

			// Call API to close session
			const response = await closeSession()

			if (response.success) {
				// Clear local session data
				clearSession()

				// Notify parent
				if (onSessionClosed) {
					onSessionClosed()
				}

				// Reload page to start fresh
				window.location.reload()
			} else {
				throw new Error('Failed to close session')
			}
		} catch (error) {
			console.error('Session close error:', error)
			setError('Failed to close session. Please try again.')

			if (onSessionError) {
				onSessionError('Failed to close session')
			}
		} finally {
			setIsClosing(false)
		}
	}

	// Export job history as JSON
	const handleExportHistory = () => {
		try {
			const jobs = getAllJobs()

			// Create export data
			const exportData = {
				exported_at: new Date().toISOString(),
				job_count: jobs.length,
				jobs: jobs.map((job) => ({
					id: job.jobId,
					filename: job.originalFilename,
					target_format: job.targetFormat,
					status: job.status,
					size: job.fileSize,
					created_at: job.createdAt,
					completed_at: job.completedAt || null
				}))
			}

			// Convert to JSON string
			const jsonString = JSON.stringify(exportData, null, 2)

			// Create blob and download link
			const blob = new Blob([jsonString], { type: 'application/json' })
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `trustyconvert-history-${new Date().toISOString().slice(0, 10)}.json`
			a.click()

			// Clean up
			URL.revokeObjectURL(url)
		} catch (error) {
			console.error('Export error:', error)
			setError('Failed to export conversion history')
		}
	}

	// If initializing, show loading
	if (getInitializing()) {
		return (
			<div className="flex items-center rounded-lg bg-blue-50 p-3 text-blue-800">
				<div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
				<span className="text-sm">Initializing session...</span>
			</div>
		)
	}

	// If no session token, show warning
	if (!getCSRFToken()) {
		return (
			<div className="rounded-lg bg-yellow-50 p-3 text-yellow-800">
				<span className="text-sm">No active session. Please refresh the page.</span>
			</div>
		)
	}

	return (
		<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<div className="mb-3 flex items-center justify-between">
				<h3 className="font-medium text-gray-900">Session Status</h3>
				<div className="flex items-center">
					<span className="mr-2 inline-block h-2 w-2 rounded-full bg-green-500"></span>
					<span className="text-sm text-gray-600">Active</span>
				</div>
			</div>

			<div className="mb-4 grid grid-cols-2 gap-4 text-sm">
				<div>
					<p className="text-gray-500">Time Remaining</p>
					<p className="font-medium">
						{timeRemaining !== null ? formatTimeRemaining(timeRemaining) : 'Unknown'}
					</p>
				</div>
				<div>
					<p className="text-gray-500">Conversions</p>
					<p className="font-medium">{jobCount}</p>
				</div>
			</div>

			{error && <div className="mb-3 rounded-md bg-red-50 p-2 text-xs text-red-700">{error}</div>}

			<div className="flex flex-wrap gap-2">
				<button
					onClick={handleCloseSession}
					disabled={isClosing}
					className="flex items-center rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
				>
					{isClosing ? (
						<>
							<div className="mr-1.5 h-3 w-3 animate-spin rounded-full border border-red-600 border-t-transparent"></div>
							Closing...
						</>
					) : (
						<>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="mr-1.5 h-3.5 w-3.5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
								/>
							</svg>
							Close Session
						</>
					)}
				</button>

				{showExportOption && jobCount > 0 && (
					<button
						onClick={handleExportHistory}
						className="flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="mr-1.5 h-3.5 w-3.5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
						Export History
					</button>
				)}
			</div>

			<div className="mt-3 text-xs text-gray-400">
				Sessions automatically expire after 24 hours of inactivity.
			</div>
		</div>
	)
}

export default SessionManager

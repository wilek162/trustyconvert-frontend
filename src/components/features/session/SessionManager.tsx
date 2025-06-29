import React, { useState, useEffect } from 'react'
import { closeSession } from '@/lib/api/apiClient'
import { getCSRFToken } from '@/lib/stores/session'
import { getAllJobs } from '@/lib/stores/upload'
import type { FileUploadData } from '@/lib/stores/upload'
import { CloseSession } from '@/components/features/session'

interface SessionManagerProps {
	onSessionClosed?: () => void
	onSessionError?: (error: string) => void
	showExportOption?: boolean
}

/**
 * SessionManager component
 *
 * Displays session information and allows the user to close their session
 */
function SessionManager({
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

	// Handle session close
	const handleCloseSession = async () => {
		setIsClosing(true)
		setError(null)

		try {
			await closeSession()
			if (onSessionClosed) {
				onSessionClosed()
			}
			// Reload page to get a fresh session
			window.location.reload()
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to close session'
			setError(errorMessage)
			if (onSessionError) {
				onSessionError(errorMessage)
			}
		} finally {
			setIsClosing(false)
		}
	}

	// Handle job export
	const handleExportJobs = () => {
		try {
			const jobs = getAllJobs()
			if (jobs.length === 0) {
				setError('No jobs to export')
				return
			}

			// Create a JSON blob and download it
			const jobsJson = JSON.stringify(jobs, null, 2)
			const blob = new Blob([jobsJson], { type: 'application/json' })
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `trustyconvert-jobs-${new Date().toISOString().split('T')[0]}.json`
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			URL.revokeObjectURL(url)
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to export jobs'
			setError(errorMessage)
		}
	}

	// If no CSRF token, show warning
	if (!getCSRFToken()) {
		return (
			<div className="rounded-lg bg-yellow-50 p-3 text-deepNavy">
				<span className="text-sm">No active session. Please refresh the page.</span>
			</div>
		)
	}

	return (
		<div className="rounded-xl border border-trustTeal/20 bg-white p-4 shadow-sm">
			<div className="mb-3 flex items-center justify-between">
				<h3 className="font-medium text-deepNavy">Session Security</h3>
				<div className="flex items-center">
					<span className="mr-2 inline-block h-2 w-2 rounded-full bg-trustTeal"></span>
					<span className="text-sm text-deepNavy/70">Session Active</span>
				</div>
			</div>

			<div className="mb-4 grid grid-cols-2 gap-4 text-sm">
				<div>
					<p className="text-muted-foreground">Time Remaining</p>
					<p className="font-medium text-deepNavy">
						{timeRemaining !== null ? formatTimeRemaining(timeRemaining) : 'Unknown'}
					</p>
				</div>
				<div>
					<p className="text-muted-foreground">Conversions</p>
					<p className="font-medium text-deepNavy">{jobCount}</p>
				</div>
			</div>

			{error && (
				<div className="mb-3 rounded-md bg-warningRed/10 p-2 text-xs text-warningRed">{error}</div>
			)}

			<div className="flex flex-col gap-2">
				<button
					onClick={handleCloseSession}
					disabled={isClosing}
					className="flex w-full items-center justify-center rounded-md bg-deepNavy px-4 py-2 text-sm font-medium text-white hover:bg-deepNavy/90 disabled:opacity-50"
				>
					{isClosing ? (
						<>
							<span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
							Closing Session...
						</>
					) : (
						'Close Session'
					)}
				</button>

				{showExportOption && (
					<button
						onClick={handleExportJobs}
						className="flex w-full items-center justify-center rounded-md border border-deepNavy/20 bg-white px-4 py-2 text-sm font-medium text-deepNavy hover:bg-deepNavy/5"
					>
						Export Conversion History
					</button>
				)}
			</div>
		</div>
	)
}

export default SessionManager

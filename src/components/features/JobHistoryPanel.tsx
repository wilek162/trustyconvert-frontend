import React, { useState, useEffect } from 'react'
import { getDownloadToken, closeSession } from '@/lib/api/apiClient'
import { getAllJobs, removeJob, getCompletedJobs } from '@/lib/stores/upload'
import type { FileUploadData } from '@/lib/stores/upload'

interface JobHistoryPanelProps {
	onSelectJob?: (jobId: string) => void
	maxItems?: number
}

export function JobHistoryPanel({ onSelectJob, maxItems = 10 }: JobHistoryPanelProps) {
	const [jobs, setJobs] = useState<FileUploadData[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [statistics, setStatistics] = useState({
		totalJobs: 0,
		successRate: 0,
		commonFormats: [] as { format: string; count: number }[]
	})
	const [error, setError] = useState<string | null>(null)

	// Load jobs from store
	useEffect(() => {
		const loadJobs = async () => {
			try {
				setIsLoading(true)
				const allJobs = getAllJobs()

				// Sort by creation date (newest first)
				const sortedJobs = [...allJobs].sort(
					(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
				)

				// Limit number of jobs displayed
				const limitedJobs = sortedJobs.slice(0, maxItems)
				setJobs(limitedJobs)

				// Calculate statistics
				calculateStatistics(allJobs)
			} catch (error) {
				console.error('Failed to load job history:', error)
				setError('Failed to load job history')
			} finally {
				setIsLoading(false)
			}
		}

		loadJobs()

		// Set up interval to refresh job list every 30 seconds
		const intervalId = setInterval(loadJobs, 30000)

		return () => clearInterval(intervalId)
	}, [maxItems])

	// Calculate conversion statistics
	const calculateStatistics = (allJobs: FileUploadData[]) => {
		const totalJobs = allJobs.length
		const completedJobs = allJobs.filter((job) => job.status === 'completed').length
		const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0

		// Find common target formats
		const formatCounts: Record<string, number> = {}
		allJobs.forEach((job) => {
			if (job.targetFormat) {
				formatCounts[job.targetFormat] = (formatCounts[job.targetFormat] || 0) + 1
			}
		})

		// Convert to array and sort
		const commonFormats = Object.entries(formatCounts)
			.map(([format, count]) => ({ format, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 3) // Top 3 formats

		setStatistics({
			totalJobs,
			successRate,
			commonFormats
		})
	}

	// Handle re-download
	const handleReDownload = async (job: FileUploadData) => {
		try {
			// If job already has download token, use it
			if (job.downloadToken) {
				window.open(`/api/download?token=${job.downloadToken}`, '_blank')
				return
			}

			// Otherwise, get new token
			const response = await getDownloadToken(job.jobId)

			if (response.success && response.data.download_token) {
				window.open(`/api/download?token=${response.data.download_token}`, '_blank')
			} else {
				throw new Error('Failed to get download token')
			}
		} catch (error) {
			console.error('Download error:', error)
			setError('Failed to download file')
		}
	}

	// Clear a single job
	const handleClearJob = async (jobId: string) => {
		try {
			await removeJob(jobId)
			setJobs(jobs.filter((job) => job.jobId !== jobId))
		} catch (error) {
			console.error('Failed to clear job:', error)
			setError('Failed to remove job from history')
		}
	}

	// Clear all history
	const handleClearAll = async () => {
		try {
			// Confirm with user
			if (!window.confirm('Are you sure you want to clear all conversion history?')) {
				return
			}

			// Remove all jobs
			for (const job of jobs) {
				await removeJob(job.jobId)
			}

			setJobs([])
		} catch (error) {
			console.error('Failed to clear history:', error)
			setError('Failed to clear conversion history')
		}
	}

	// Format date for display
	const formatDate = (dateString: string) => {
		const date = new Date(dateString)
		return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
	}

	// Get icon for file type
	const getFileIcon = (mimeType: string) => {
		if (mimeType.includes('pdf')) return '📄'
		if (mimeType.includes('word')) return '📝'
		if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊'
		if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📊'
		if (mimeType.includes('image')) return '🖼️'
		if (mimeType.includes('text')) return '📝'
		return '📄'
	}

	// Get status badge style
	const getStatusBadge = (status: string) => {
		switch (status) {
			case 'completed':
				return (
					<span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
						Completed
					</span>
				)
			case 'failed':
				return (
					<span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
						Failed
					</span>
				)
			case 'processing':
				return (
					<span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
						Processing
					</span>
				)
			case 'uploaded':
				return (
					<span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
						Uploaded
					</span>
				)
			default:
				return (
					<span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800">
						{status}
					</span>
				)
		}
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
				<span className="ml-2">Loading job history...</span>
			</div>
		)
	}

	if (error) {
		return (
			<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
				<p>{error}</p>
				<button
					onClick={() => setError(null)}
					className="mt-2 text-sm font-medium text-red-700 hover:text-red-800"
				>
					Try Again
				</button>
			</div>
		)
	}

	return (
		<div className="w-full">
			<div className="mb-6 flex items-center justify-between">
				<h2 className="text-xl font-semibold text-gray-900">Conversion History</h2>
				{jobs.length > 0 && (
					<button
						onClick={handleClearAll}
						className="text-sm font-medium text-red-600 hover:text-red-800"
					>
						Clear All
					</button>
				)}
			</div>

			{/* Statistics */}
			{statistics.totalJobs > 0 && (
				<div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
					<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
						<div className="text-2xl font-bold text-blue-600">{statistics.totalJobs}</div>
						<div className="text-sm text-gray-500">Total Conversions</div>
					</div>
					<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
						<div className="text-2xl font-bold text-green-600">
							{statistics.successRate.toFixed(0)}%
						</div>
						<div className="text-sm text-gray-500">Success Rate</div>
					</div>
					<div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
						<div className="text-sm font-medium text-gray-900">Top Formats</div>
						<div className="mt-1">
							{statistics.commonFormats.map(({ format, count }) => (
								<span
									key={format}
									className="mr-2 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800"
								>
									{format.toUpperCase()} ({count})
								</span>
							))}
						</div>
					</div>
				</div>
			)}

			{/* Jobs list */}
			{jobs.length === 0 ? (
				<div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
					<p className="text-gray-500">No conversion history yet</p>
					<p className="mt-2 text-sm text-gray-400">Your recent conversions will appear here</p>
				</div>
			) : (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{jobs.map((job) => (
						<div
							key={job.jobId}
							className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
						>
							<div className="mb-2 flex items-start justify-between">
								<div className="flex items-center">
									<span className="mr-2 text-2xl">{getFileIcon(job.mimeType)}</span>
									<div>
										<h3 className="font-medium text-gray-900" title={job.originalFilename}>
											{job.originalFilename.length > 20
												? job.originalFilename.substring(0, 17) + '...'
												: job.originalFilename}
										</h3>
										<p className="text-xs text-gray-500">{formatDate(job.createdAt)}</p>
									</div>
								</div>
								<button
									onClick={() => handleClearJob(job.jobId)}
									className="text-gray-400 hover:text-gray-600"
									title="Remove from history"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="h-4 w-4"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</button>
							</div>

							<div className="mb-3 flex items-center justify-between">
								<div>
									<p className="text-xs text-gray-600">
										<span className="font-medium">Format:</span> {job.targetFormat.toUpperCase()}
									</p>
									<p className="text-xs text-gray-600">
										<span className="font-medium">Size:</span> {(job.fileSize / 1024).toFixed(0)} KB
									</p>
								</div>
								<div>{getStatusBadge(job.status)}</div>
							</div>

							<div className="mt-3 flex space-x-2">
								{job.status === 'completed' && (
									<button
										onClick={() => handleReDownload(job)}
										className="flex flex-1 items-center justify-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="mr-1 h-4 w-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
											/>
										</svg>
										Download
									</button>
								)}
								{job.status !== 'failed' && job.status !== 'completed' && onSelectJob && (
									<button
										onClick={() => onSelectJob(job.jobId)}
										className="flex flex-1 items-center justify-center rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-300"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="mr-1 h-4 w-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
											/>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
											/>
										</svg>
										View
									</button>
								)}
								{job.status === 'failed' && (
									<button
										onClick={() => onSelectJob && onSelectJob(job.jobId)}
										className="flex flex-1 items-center justify-center rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-200"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											className="mr-1 h-4 w-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
											/>
										</svg>
										Retry
									</button>
								)}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}

export default JobHistoryPanel

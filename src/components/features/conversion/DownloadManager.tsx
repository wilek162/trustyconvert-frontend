import React, { useState, useEffect } from 'react'
import { getDownloadToken } from '@/lib/api/apiClient'
import { getJob, setJobDownloadToken } from '@/lib/stores/upload'
import type { FileUploadData } from '@/lib/stores/upload'

interface DownloadManagerProps {
	jobId: string
	onDownloadComplete?: () => void
	onError?: (error: string) => void
}

function DownloadManager({ jobId, onDownloadComplete, onError }: DownloadManagerProps) {
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
	const [job, setJob] = useState<FileUploadData | null>(null)
	const [downloadStarted, setDownloadStarted] = useState(false)

	// Load job data
	useEffect(() => {
		const jobData = getJob(jobId)
		if (jobData) {
			setJob(jobData)

			// If job already has a download token, use it
			if (jobData.downloadToken) {
				setDownloadUrl(`/api/download?token=${jobData.downloadToken}`)
			} else {
				// Otherwise get a new token
				fetchDownloadToken()
			}
		} else {
			setError('Job not found')
			if (onError) onError('Job not found')
		}
	}, [jobId])

	// Fetch download token
	const fetchDownloadToken = async () => {
		try {
			setIsLoading(true)
			setError(null)

			const response = await getDownloadToken(jobId)

			if (response.success && response.data.download_token) {
				const token = response.data.download_token

				// Save token to job store
				await setJobDownloadToken(jobId, token)

				// Set download URL
				setDownloadUrl(`/api/download?token=${token}`)
			} else {
				throw new Error('Failed to get download token')
			}
		} catch (error) {
			console.error('Download token error:', error)
			const errorMessage = error instanceof Error ? error.message : 'Failed to prepare download'
			setError(errorMessage)
			if (onError) onError(errorMessage)
		} finally {
			setIsLoading(false)
		}
	}

	// Handle download click
	const handleDownload = () => {
		if (!downloadUrl) return

		// Track download start
		setDownloadStarted(true)

		// Notify parent
		if (onDownloadComplete) {
			// Small delay to allow download to start
			setTimeout(() => {
				onDownloadComplete()
			}, 1000)
		}
	}

	// Retry getting download token
	const handleRetry = () => {
		fetchDownloadToken()
	}

	if (!job) {
		return <div className="text-center text-gray-500">Loading job data...</div>
	}

	return (
		<div className="w-full">
			{/* File info */}
			<div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
				<div className="flex items-center">
					<div className="mr-3 text-gray-400">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							className="h-8 w-8"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
					</div>
					<div>
						<h3 className="font-medium text-gray-900">
							{job.originalFilename.replace(/\.[^/.]+$/, '')}.{job.targetFormat}
						</h3>
						<p className="text-sm text-gray-500">Ready to download</p>
					</div>
				</div>
			</div>

			{/* Loading state */}
			{isLoading && (
				<div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
					<div className="flex items-center">
						<div className="mr-3">
							<svg
								className="h-5 w-5 animate-spin text-blue-600"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									className="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="4"
								></circle>
								<path
									className="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
						</div>
						<div>
							<p className="font-medium text-blue-800">Preparing your download</p>
							<p className="text-sm text-blue-600">This will only take a moment...</p>
						</div>
					</div>
				</div>
			)}

			{/* Error message */}
			{error && (
				<div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
					<div className="flex items-start">
						<div className="mr-2 flex-shrink-0">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-5 w-5"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fillRule="evenodd"
									d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
									clipRule="evenodd"
								/>
							</svg>
						</div>
						<div className="flex-1">
							<p>{error}</p>
							<button
								onClick={handleRetry}
								className="mt-2 text-sm font-medium text-red-700 hover:text-red-800"
							>
								Retry
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Download button */}
			{downloadUrl && !isLoading && !error && (
				<div className="text-center">
					{!downloadStarted ? (
						<a
							href={downloadUrl}
							onClick={handleDownload}
							className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
							download
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="mr-2 h-5 w-5"
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
							Download File
						</a>
					) : (
						<div className="text-green-600">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="mx-auto mb-2 h-12 w-12"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							<p className="font-medium">Download started!</p>
							<p className="mt-1 text-sm text-gray-600">
								If your download didn't begin,{' '}
								<a href={downloadUrl} className="text-blue-600 hover:underline" download>
									click here
								</a>
								.
							</p>
						</div>
					)}

					<p className="mt-4 text-xs text-gray-500">
						For security reasons, this download link will expire in 10 minutes.
					</p>
				</div>
			)}
		</div>
	)
}

export default DownloadManager
export { DownloadManager }

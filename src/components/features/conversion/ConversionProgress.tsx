import React, { useState, useEffect } from 'react'
import { getJobStatus } from '@/lib/api/apiClient'
import { getJob, updateJobStatus } from '@/lib/stores/upload'
import type { FileUploadData, JobStatus } from '@/lib/stores/upload'

// Define conversion steps
const CONVERSION_STEPS = [
	{ key: 'uploaded', label: 'Uploaded', description: 'File has been uploaded successfully' },
	{ key: 'processing', label: 'Processing', description: 'Converting your file' },
	{ key: 'completed', label: 'Completed', description: 'Ready for download' }
]

// Props interface
interface ConversionProgressProps {
	jobId: string
	onConversionComplete?: (jobId: string) => void
	onConversionFailed?: (error: string) => void
	autoPolling?: boolean
	pollInterval?: number
}

function ConversionProgress({
	jobId,
	onConversionComplete,
	onConversionFailed,
	autoPolling = true,
	pollInterval = 3000
}: ConversionProgressProps) {
	const [job, setJob] = useState<FileUploadData | null>(null)
	const [currentStep, setCurrentStep] = useState<string>('uploaded')
	const [progress, setProgress] = useState<number>(0)
	const [elapsedTime, setElapsedTime] = useState<number>(0)
	const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null)
	const [pollingTimerId, setPollingTimerId] = useState<NodeJS.Timeout | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [adaptiveInterval, setAdaptiveInterval] = useState<number>(pollInterval)

	// Load job data and start polling
	useEffect(() => {
		const loadJob = async () => {
			const jobData = getJob(jobId)
			if (jobData) {
				setJob(jobData)
				setCurrentStep(jobData.status)

				// Calculate initial progress based on status
				if (jobData.status === 'uploaded') {
					setProgress(33)
				} else if (jobData.status === 'processing') {
					setProgress(66)
				} else if (jobData.status === 'completed') {
					setProgress(100)
				}
			}
		}

		loadJob()

		// Start elapsed time counter
		const startTime = Date.now()
		const elapsedTimeInterval = setInterval(() => {
			setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
		}, 1000)

		// Cleanup
		return () => {
			if (pollingTimerId) {
				clearInterval(pollingTimerId)
			}
			clearInterval(elapsedTimeInterval)
		}
	}, [jobId])

	// Set up polling with adaptive intervals
	useEffect(() => {
		if (!autoPolling || !job) return

		// Clear existing timer
		if (pollingTimerId) {
			clearInterval(pollingTimerId)
		}

		// Skip polling if job is already completed or failed
		if (job.status === 'completed' || job.status === 'failed') {
			return
		}

		// Adaptive polling intervals based on elapsed time
		let interval = pollInterval
		if (elapsedTime < 30) {
			// Fast polling for first 30 seconds (1s)
			interval = 1000
		} else if (elapsedTime < 150) {
			// Medium polling for next 2 minutes (3s)
			interval = 3000
		} else {
			// Slow polling for longer jobs (10s)
			interval = 10000
		}

		// Stop polling after 10 minutes
		if (elapsedTime > 600) {
			return
		}

		setAdaptiveInterval(interval)

		// Start new polling timer
		const timerId = setInterval(pollJobStatus, interval)
		setPollingTimerId(timerId)

		return () => {
			clearInterval(timerId)
		}
	}, [autoPolling, job, elapsedTime, pollInterval])

	// Poll for job status
	const pollJobStatus = async () => {
		try {
			const response = await getJobStatus(jobId)

			if (!response.success) {
				throw new Error('Failed to get job status')
			}

			const { status, error_message } = response.data

			// Update job status in store
			if (status) {
				await updateJobStatus(jobId, status as JobStatus, {
					errorMessage: error_message
				})

				// Update local state
				const updatedJob = getJob(jobId)
				if (updatedJob) {
					setJob(updatedJob)
					setCurrentStep(status)

					// Update progress based on status
					if (status === 'uploaded') {
						setProgress(33)
					} else if (status === 'processing') {
						setProgress(66)
					} else if (status === 'completed') {
						setProgress(100)

						// Notify parent
						if (onConversionComplete) {
							onConversionComplete(jobId)
						}
					} else if (status === 'failed') {
						setError(error_message || 'Conversion failed')

						// Notify parent
						if (onConversionFailed) {
							onConversionFailed(error_message || 'Conversion failed')
						}
					}
				}
			}
		} catch (error) {
			console.error('Error polling job status:', error)
			setError(error instanceof Error ? error.message : 'Error checking conversion status')
		}
	}

	// Calculate estimated time remaining
	useEffect(() => {
		if (!job || job.status === 'completed' || job.status === 'failed') {
			setEstimatedTimeRemaining(null)
			return
		}

		// Simple estimation based on file size and elapsed time
		// This is a very basic estimation - a real implementation would need more data points
		if (elapsedTime > 0 && job.fileSize > 0) {
			// Assume we're 33% done if uploaded, 66% if processing
			const progressPercent = job.status === 'uploaded' ? 0.33 : 0.66

			// Estimate time based on how long it took to get to current progress
			const totalEstimatedTime = elapsedTime / progressPercent
			const remaining = Math.max(0, totalEstimatedTime - elapsedTime)

			setEstimatedTimeRemaining(Math.round(remaining))
		}
	}, [job, elapsedTime])

	// Format time for display (seconds to mm:ss)
	const formatTime = (seconds: number): string => {
		const mins = Math.floor(seconds / 60)
		const secs = seconds % 60
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	// Handle retry button click
	const handleRetry = async () => {
		setError(null)

		// Reset to uploaded state
		await updateJobStatus(jobId, 'uploaded')

		// Reload job data
		const updatedJob = getJob(jobId)
		if (updatedJob) {
			setJob(updatedJob)
			setCurrentStep('uploaded')
			setProgress(33)
		}
	}

	// Handle cancel button click
	const handleCancel = () => {
		// Clear polling
		if (pollingTimerId) {
			clearInterval(pollingTimerId)
		}

		// Notify parent
		if (onConversionFailed) {
			onConversionFailed('Conversion cancelled by user')
		}
	}

	if (!job) {
		return (
			<div className="flex items-center justify-center p-4">
				<div className="h-6 w-6 animate-spin rounded-full border-b-2 border-t-2 border-blue-500"></div>
				<span className="ml-2 text-gray-600">Loading conversion details...</span>
			</div>
		)
	}

	if (error) {
		return (
			<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
				<h3 className="mb-2 font-medium">Conversion Failed</h3>
				<p className="text-sm">{error}</p>
				<div className="mt-4 flex space-x-3">
					<button
						onClick={handleRetry}
						className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
					>
						Retry
					</button>
					<button
						onClick={handleCancel}
						className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
					>
						Cancel
					</button>
				</div>
			</div>
		)
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
						<h3 className="font-medium text-gray-900">{job.originalFilename}</h3>
						<p className="text-sm text-gray-500">
							{(job.fileSize / (1024 * 1024)).toFixed(2)} MB • Converting to{' '}
							{job.targetFormat.toUpperCase()}
						</p>
					</div>
				</div>
			</div>

			{/* Progress bar */}
			<div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
				<div
					className="h-full rounded-full bg-blue-600 transition-all duration-500 ease-in-out"
					style={{ width: `${progress}%` }}
				></div>
			</div>

			{/* Progress details */}
			<div className="mb-6 flex items-center justify-between text-sm text-gray-500">
				<div>
					Elapsed: <span className="font-medium">{formatTime(elapsedTime)}</span>
				</div>
				{estimatedTimeRemaining !== null && (
					<div>
						Estimated: <span className="font-medium">{formatTime(estimatedTimeRemaining)}</span>
					</div>
				)}
				<div>
					Status: <span className="font-medium capitalize">{currentStep}</span>
				</div>
			</div>

			{/* Steps visualization */}
			<div className="mb-6">
				<div className="relative">
					<div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 transform bg-gray-200"></div>

					<div className="relative flex justify-between">
						{CONVERSION_STEPS.map((step, index) => {
							// Determine if step is active or completed
							const isCompleted =
								(step.key === 'uploaded' &&
									['uploaded', 'processing', 'completed'].includes(currentStep)) ||
								(step.key === 'processing' && ['processing', 'completed'].includes(currentStep)) ||
								(step.key === 'completed' && currentStep === 'completed')

							const isActive = step.key === currentStep

							return (
								<div key={step.key} className="flex flex-col items-center">
									<div
										className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
											isCompleted
												? 'border-blue-600 bg-blue-600 text-white'
												: isActive
													? 'border-blue-600 bg-white text-blue-600'
													: 'border-gray-300 bg-white text-gray-400'
										}`}
									>
										{isCompleted ? (
											<svg
												className="h-5 w-5"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M5 13l4 4L19 7"
												/>
											</svg>
										) : (
											index + 1
										)}
									</div>
									<div
										className={`mt-2 text-center text-xs font-medium ${
											isActive || isCompleted ? 'text-blue-600' : 'text-gray-500'
										}`}
									>
										{step.label}
									</div>
									<div className="text-center text-xs text-gray-400">{step.description}</div>
								</div>
							)
						})}
					</div>
				</div>
			</div>

			{/* Action buttons */}
			<div className="flex justify-end space-x-3">
				<button
					onClick={handleCancel}
					className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
				>
					Cancel
				</button>
				{currentStep === 'uploaded' && (
					<button
						onClick={pollJobStatus}
						className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
					>
						Check Status
					</button>
				)}
			</div>

			{/* Polling info */}
			<div className="mt-4 text-center text-xs text-gray-400">
				{autoPolling ? (
					<>
						Auto-updating every {Math.round(adaptiveInterval / 1000)} seconds
						<button
							onClick={() => {
								if (pollingTimerId) {
									clearInterval(pollingTimerId)
									setPollingTimerId(null)
								}
							}}
							className="ml-2 text-blue-500 hover:text-blue-700"
						>
							Stop
						</button>
					</>
				) : (
					<>
						Auto-update paused
						<button
							onClick={() => {
								const timerId = setInterval(pollJobStatus, adaptiveInterval)
								setPollingTimerId(timerId)
							}}
							className="ml-2 text-blue-500 hover:text-blue-700"
						>
							Resume
						</button>
					</>
				)}
			</div>
		</div>
	)
}

export default ConversionProgress
export { ConversionProgress }

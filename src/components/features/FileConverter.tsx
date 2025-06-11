import React, { useState, useEffect } from 'react'
import { initSession } from '@/lib/api/apiClient'
import { getCSRFToken } from '@/lib/stores/session'
import FileUploadZone from './FileUploadZone'
import ConversionInterface from './ConversionInterface'
import DownloadManager from './DownloadManager'
import JobHistoryPanel from './JobHistoryPanel'
import ConversionProgress from './ConversionProgress'
import SessionManager from './SessionManager'

// Conversion workflow steps
type ConversionStep = 'upload' | 'convert' | 'download' | 'complete'

export function FileConverter() {
	const [currentStep, setCurrentStep] = useState<ConversionStep>('upload')
	const [jobId, setJobId] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [isInitializing, setIsInitializing] = useState(true)
	const [showJobHistory, setShowJobHistory] = useState(false)

	// Initialize session on component mount
	useEffect(() => {
		const initializeSession = async () => {
			try {
				setIsInitializing(true)
				await initSession()

				// Verify CSRF token was set
				const csrfToken = getCSRFToken()
				if (!csrfToken) {
					throw new Error('Failed to initialize session')
				}
			} catch (error) {
				console.error('Session initialization error:', error)
				setError('Failed to initialize secure session. Please refresh the page.')
			} finally {
				setIsInitializing(false)
			}
		}

		initializeSession()
	}, [])

	// Handle file upload completion
	const handleFileUploaded = (uploadedJobId: string) => {
		setJobId(uploadedJobId)
		setCurrentStep('convert')
	}

	// Handle conversion completion
	const handleConversionComplete = (convertedJobId: string) => {
		setJobId(convertedJobId)
		setCurrentStep('download')
	}

	// Handle conversion failure
	const handleConversionFailed = (errorMessage: string) => {
		setError(errorMessage)
	}

	// Handle download completion
	const handleDownloadComplete = () => {
		setCurrentStep('complete')
	}

	// Handle starting a new conversion
	const handleStartNew = () => {
		setJobId(null)
		setCurrentStep('upload')
		setError(null)
	}

	// Handle job selection from history
	const handleJobSelected = (selectedJobId: string) => {
		setJobId(selectedJobId)
		setShowJobHistory(false)

		// Set appropriate step based on job status
		// This would need to be enhanced to check the actual job status
		setCurrentStep('download')
	}

	// Render loading state
	if (isInitializing) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="text-center">
					<div className="mb-4">
						<svg
							className="mx-auto h-10 w-10 animate-spin text-blue-600"
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
					<p className="text-lg font-medium text-gray-900">
						Initializing secure conversion environment...
					</p>
					<p className="mt-2 text-sm text-gray-500">This will only take a moment.</p>
				</div>
			</div>
		)
	}

	// Render error state
	if (error) {
		return (
			<div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
				<div className="mb-4">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="mx-auto h-12 w-12 text-red-500"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				</div>
				<h3 className="text-lg font-medium text-red-800">Something went wrong</h3>
				<p className="mt-2 text-sm text-red-700">{error}</p>
				<button
					onClick={handleStartNew}
					className="mt-4 rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
				>
					Try Again
				</button>
			</div>
		)
	}

	return (
		<div className="mx-auto w-full max-w-2xl">
			{/* Session Manager */}
			<div className="mb-6">
				<SessionManager />
			</div>

			{/* Progress steps */}
			<div className="mb-8">
				<div className="flex items-center justify-between">
					<div className="flex items-center">
						<div
							className={`flex h-8 w-8 items-center justify-center rounded-full ${
								currentStep === 'upload'
									? 'bg-blue-600 text-white'
									: currentStep === 'convert' ||
										  currentStep === 'download' ||
										  currentStep === 'complete'
										? 'bg-green-500 text-white'
										: 'bg-gray-200 text-gray-600'
							}`}
						>
							{currentStep === 'upload' ? '1' : '✓'}
						</div>
						<div className="ml-2">
							<p
								className={`text-sm font-medium ${currentStep === 'upload' ? 'text-blue-600' : 'text-gray-900'}`}
							>
								Upload
							</p>
						</div>
					</div>

					<div
						className={`mx-4 h-1 flex-1 ${
							currentStep === 'convert' || currentStep === 'download' || currentStep === 'complete'
								? 'bg-green-500'
								: 'bg-gray-200'
						}`}
					></div>

					<div className="flex items-center">
						<div
							className={`flex h-8 w-8 items-center justify-center rounded-full ${
								currentStep === 'convert'
									? 'bg-blue-600 text-white'
									: currentStep === 'download' || currentStep === 'complete'
										? 'bg-green-500 text-white'
										: 'bg-gray-200 text-gray-600'
							}`}
						>
							{currentStep === 'convert'
								? '2'
								: currentStep === 'download' || currentStep === 'complete'
									? '✓'
									: '2'}
						</div>
						<div className="ml-2">
							<p
								className={`text-sm font-medium ${currentStep === 'convert' ? 'text-blue-600' : 'text-gray-900'}`}
							>
								Convert
							</p>
						</div>
					</div>

					<div
						className={`mx-4 h-1 flex-1 ${
							currentStep === 'download' || currentStep === 'complete'
								? 'bg-green-500'
								: 'bg-gray-200'
						}`}
					></div>

					<div className="flex items-center">
						<div
							className={`flex h-8 w-8 items-center justify-center rounded-full ${
								currentStep === 'download'
									? 'bg-blue-600 text-white'
									: currentStep === 'complete'
										? 'bg-green-500 text-white'
										: 'bg-gray-200 text-gray-600'
							}`}
						>
							{currentStep === 'download' ? '3' : currentStep === 'complete' ? '✓' : '3'}
						</div>
						<div className="ml-2">
							<p
								className={`text-sm font-medium ${currentStep === 'download' ? 'text-blue-600' : 'text-gray-900'}`}
							>
								Download
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Toggle job history */}
			<div className="mb-4 flex justify-end">
				<button
					onClick={() => setShowJobHistory(!showJobHistory)}
					className="flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						className="mr-1.5 h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					{showJobHistory ? 'Hide History' : 'View History'}
				</button>
			</div>

			{/* Main content area */}
			<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
				{showJobHistory ? (
					<JobHistoryPanel onSelectJob={handleJobSelected} maxItems={6} />
				) : (
					<>
						{currentStep === 'upload' && (
							<div>
								<h2 className="mb-4 text-xl font-semibold text-gray-900">Upload Your File</h2>
								<FileUploadZone onFileUploaded={handleFileUploaded} />
							</div>
						)}

						{currentStep === 'convert' && jobId && (
							<div>
								<h2 className="mb-4 text-xl font-semibold text-gray-900">Convert Your File</h2>
								<ConversionInterface
									jobId={jobId}
									onConversionComplete={handleConversionComplete}
									onConversionFailed={handleConversionFailed}
								/>
							</div>
						)}

						{currentStep === 'download' && jobId && (
							<div>
								<h2 className="mb-4 text-xl font-semibold text-gray-900">Download Your File</h2>
								<DownloadManager
									jobId={jobId}
									onDownloadComplete={handleDownloadComplete}
									onError={handleConversionFailed}
								/>
							</div>
						)}

						{currentStep === 'complete' && (
							<div className="text-center">
								<div className="mb-4 text-green-500">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										className="mx-auto h-16 w-16"
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
								</div>
								<h2 className="mb-2 text-2xl font-bold text-gray-900">Conversion Complete!</h2>
								<p className="mb-6 text-gray-600">
									Your file has been successfully converted and downloaded.
								</p>
								<div className="flex flex-col space-y-3 sm:flex-row sm:space-x-3 sm:space-y-0">
									<button
										onClick={handleStartNew}
										className="rounded-md bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
									>
										Convert Another File
									</button>
									<button
										onClick={() => setShowJobHistory(true)}
										className="rounded-md border border-gray-300 bg-white px-6 py-3 text-gray-700 hover:bg-gray-50"
									>
										View Conversion History
									</button>
								</div>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	)
}

export default FileConverter

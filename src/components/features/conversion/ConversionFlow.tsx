import React, { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'sonner'

import { UploadZone } from '@/components/features/upload'
import { FormatSelector, ConversionStats } from '@/components/features/conversion'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { SessionManager } from '@/components/features/session'

import { apiClient } from '@/lib/api/client'
import { useSessionInitializer } from '@/lib/hooks/useSessionInitializer'
import {
	addJob,
	updateJobStatus,
	updateJobProgress,
	setJobDownloadToken
} from '@/lib/stores/upload'
import type { JobStatus } from '@/lib/types/api'
import { getFileExtension, formatFileSize } from '@/lib/utils/files'

// Polling interval for job status
const STATUS_POLLING_INTERVAL = 2000 // 2 seconds

// Supported conversions map
const SUPPORTED_FORMATS = {
	document: ['pdf', 'docx', 'doc', 'txt', 'rtf', 'odt'],
	image: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'],
	spreadsheet: ['xlsx', 'xls', 'csv'],
	presentation: ['pptx', 'ppt']
}

interface ConversionFlowProps {
	initialSourceFormat?: string
	initialTargetFormat?: string
	title?: string
}

// Main conversion workflow component
export function ConversionFlow({
	initialSourceFormat,
	initialTargetFormat,
	title = 'Convert Your File'
}: ConversionFlowProps) {
	// Use session initializer hook to ensure we have a valid session
	const {
		isInitialized,
		isInitializing,
		error: sessionError,
		resetSession
	} = useSessionInitializer()

	// State for tracking the conversion flow
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [targetFormat, setTargetFormat] = useState<string>(initialTargetFormat || '')
	const [availableFormats, setAvailableFormats] = useState<string[]>([])
	const [isUploading, setIsUploading] = useState(false)
	const [isConverting, setIsConverting] = useState(false)
	const [uploadProgress, setUploadProgress] = useState(0)
	const [conversionProgress, setConversionProgress] = useState(0)
	const [currentStep, setCurrentStep] = useState<'select' | 'upload' | 'convert' | 'download'>(
		'select'
	)
	const [jobId, setJobId] = useState<string>('')
	const [downloadUrl, setDownloadUrl] = useState<string>('')
	const [error, setError] = useState<string | null>(null)
	const [statusPollingInterval, setStatusPollingInterval] = useState<NodeJS.Timeout | null>(null)

	// Initialize session when component mounts
	useEffect(() => {
		const initSession = async () => {
			if (!isInitialized && !isInitializing && !sessionError) {
				try {
					await apiClient.initSession()
				} catch (error) {
					console.error('Failed to initialize session:', error)
					setError('Failed to initialize session. Please refresh the page.')
				}
			}
		}

		initSession()
	}, [isInitialized, isInitializing, sessionError])

	// Clean up polling on unmount
	useEffect(() => {
		return () => {
			if (statusPollingInterval) {
				clearInterval(statusPollingInterval)
			}
		}
	}, [statusPollingInterval])

	// Handle file upload completion
	const handleFileUploaded = useCallback(
		(file: File) => {
			setSelectedFile(file)
			setError(null)

			// Determine available conversion formats based on file type
			const extension = getFileExtension(file.name).toLowerCase()
			let formats: string[] = []

			// If we have an initialTargetFormat and it's valid for this file type, use it
			if (initialSourceFormat && initialTargetFormat && extension === initialSourceFormat) {
				formats = [initialTargetFormat]
				setTargetFormat(initialTargetFormat)
			} else {
				// Otherwise use the standard format detection logic
				if (SUPPORTED_FORMATS.document.includes(extension)) {
					formats = SUPPORTED_FORMATS.document.filter((fmt) => fmt !== extension)
				} else if (SUPPORTED_FORMATS.image.includes(extension)) {
					formats = SUPPORTED_FORMATS.image.filter((fmt) => fmt !== extension)
				} else if (SUPPORTED_FORMATS.spreadsheet.includes(extension)) {
					formats = SUPPORTED_FORMATS.spreadsheet.filter((fmt) => fmt !== extension)
				} else if (SUPPORTED_FORMATS.presentation.includes(extension)) {
					formats = SUPPORTED_FORMATS.presentation.filter((fmt) => fmt !== extension)
				}

				setAvailableFormats(formats)
				setTargetFormat(formats.length > 0 ? formats[0] : '')
			}
		},
		[initialSourceFormat, initialTargetFormat]
	)

	// Handle session closed event
	const handleSessionClosed = useCallback(() => {
		// Reset all state
		setSelectedFile(null)
		setTargetFormat(initialTargetFormat || '')
		setAvailableFormats([])
		setIsUploading(false)
		setIsConverting(false)
		setUploadProgress(0)
		setConversionProgress(0)
		setCurrentStep('select')
		setJobId('')
		setDownloadUrl('')
		setError(null)

		// Clear any polling interval
		if (statusPollingInterval) {
			clearInterval(statusPollingInterval)
			setStatusPollingInterval(null)
		}
	}, [initialTargetFormat, statusPollingInterval])

	// Handle format selection
	const handleFormatChange = useCallback((format: string) => {
		setTargetFormat(format)
	}, [])

	// Handle errors from the upload component
	const handleUploadError = useCallback((errorMessage: string) => {
		setError(errorMessage)
	}, [])

	// Poll for job status
	const pollJobStatus = useCallback(
		async (jobId: string) => {
			try {
				const statusResponse = await apiClient.getConversionStatus(jobId)

				if (!statusResponse) {
					throw new Error('Failed to get job status')
				}

				const { status, progress = 0 } = statusResponse
				setConversionProgress(progress)

				// Update job status in store
				await updateJobStatus(jobId, status as JobStatus)
				await updateJobProgress(jobId, progress)

				if (status === 'completed') {
					// Get download token
					const downloadTokenResponse = await apiClient.getDownloadToken(jobId)

					if (downloadTokenResponse && downloadTokenResponse.download_token) {
						const { download_token } = downloadTokenResponse
						await setJobDownloadToken(jobId, download_token)

						// Set download URL
						const downloadUrl = apiClient.getDownloadUrl(download_token)
						setDownloadUrl(downloadUrl)

						// Update job status and clear polling
						await updateJobStatus(jobId, 'completed')
						setIsConverting(false)
						setCurrentStep('download')

						if (statusPollingInterval) {
							clearInterval(statusPollingInterval)
							setStatusPollingInterval(null)
						}

						toast.success('File converted successfully!')
					}
				} else if (status === 'failed') {
					// Handle failure
					if (statusPollingInterval) {
						clearInterval(statusPollingInterval)
						setStatusPollingInterval(null)
					}

					setIsConverting(false)
					setError(statusResponse.error_message || 'Conversion failed')
					toast.error('Conversion failed. Please try again.')
				}
			} catch (error) {
				console.error('Error polling job status:', error)
				setError('Error checking conversion status')
			}
		},
		[statusPollingInterval]
	)

	// Start upload and conversion process
	const handleStartConversion = useCallback(async () => {
		if (!selectedFile || !targetFormat) {
			toast.error('Please select a file and target format')
			return
		}

		if (!isInitialized) {
			toast.error('Session not initialized. Please try again.')
			resetSession()
			return
		}

		try {
			// Generate a unique job ID
			const newJobId = uuidv4()
			setJobId(newJobId)

			// Add job to local store
			await addJob({
				jobId: newJobId,
				originalFilename: selectedFile.name,
				targetFormat,
				status: 'uploading',
				uploadProgress: 0,
				fileSize: selectedFile.size,
				mimeType: selectedFile.type,
				createdAt: new Date().toISOString()
			})

			// Start uploading
			setIsUploading(true)
			setCurrentStep('upload')

			// Track upload progress (simulated since the API may not support progress)
			const uploadProgressInterval = setInterval(() => {
				setUploadProgress((prev) => {
					const newProgress = Math.min(prev + 5, 95)
					updateJobProgress(newJobId, newProgress)
					return newProgress
				})
			}, 200)

			// Upload the file
			const uploadResponse = await apiClient.uploadFile(selectedFile, newJobId)

			clearInterval(uploadProgressInterval)
			setUploadProgress(100)

			// Update job status to uploaded
			await updateJobStatus(newJobId, 'uploaded')

			// Start conversion
			setIsUploading(false)
			setIsConverting(true)
			setCurrentStep('convert')

			const convertResponse = await apiClient.convertFile(newJobId, targetFormat)

			// Update job status to processing
			await updateJobStatus(newJobId, 'processing')

			// Start polling for job status
			const interval = setInterval(() => pollJobStatus(newJobId), STATUS_POLLING_INTERVAL)
			setStatusPollingInterval(interval)
		} catch (error) {
			console.error('Conversion error:', error)
			setIsUploading(false)
			setIsConverting(false)
			setError(error instanceof Error ? error.message : 'Unknown error occurred')
			toast.error('Error during conversion. Please try again.')

			// Clean up any intervals
			if (statusPollingInterval) {
				clearInterval(statusPollingInterval)
				setStatusPollingInterval(null)
			}
		}
	}, [
		selectedFile,
		targetFormat,
		isInitialized,
		resetSession,
		pollJobStatus,
		statusPollingInterval
	])

	// Handle download click
	const handleDownload = useCallback(() => {
		if (downloadUrl) {
			window.location.href = downloadUrl
		}
	}, [downloadUrl])

	// Handle restart conversion
	const handleRestart = useCallback(() => {
		// Reset state for new conversion
		setSelectedFile(null)
		setTargetFormat(initialTargetFormat || '')
		setAvailableFormats([])
		setIsUploading(false)
		setIsConverting(false)
		setUploadProgress(0)
		setConversionProgress(0)
		setCurrentStep('select')
		setJobId('')
		setDownloadUrl('')
		setError(null)

		// Clear any polling interval
		if (statusPollingInterval) {
			clearInterval(statusPollingInterval)
			setStatusPollingInterval(null)
		}
	}, [initialTargetFormat, statusPollingInterval])

	// Close session when component unmounts
	useEffect(() => {
		return () => {
			// Only close session if we're done with conversion
			if (currentStep === 'download' || currentStep === 'select') {
				apiClient.closeSession().catch(console.error)
			}
		}
	}, [currentStep])

	// Handle session errors
	useEffect(() => {
		if (sessionError) {
			setError(`Session error: ${sessionError}`)
		}
	}, [sessionError])

	return (
		<Card className="mx-auto w-full max-w-3xl overflow-hidden rounded-xl border-0 bg-white shadow-lg">
			<CardHeader className="border-b border-border/50 bg-gradient-to-r from-trustTeal/20 to-transparent pb-4 pt-5">
				<CardTitle className="text-center text-xl font-semibold text-deepNavy">{title}</CardTitle>
			</CardHeader>

			<CardContent className="bg-gradient-to-b from-white to-lightGray/10 p-6">
				{isInitializing ? (
					<div className="flex flex-col items-center justify-center py-8">
						<div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-trustTeal/20 border-t-trustTeal"></div>
						<p className="text-deepNavy">Initializing secure session...</p>
					</div>
				) : error ? (
					<div className="rounded-lg border border-warningRed/20 bg-warningRed/10 p-5 text-center">
						<p className="mb-4 text-warningRed">{error}</p>
						<Button onClick={handleRestart} variant="outline">
							Try Again
						</Button>
					</div>
				) : currentStep === 'select' ? (
					<div className="space-y-6">
						{!selectedFile ? (
							<UploadZone onFileAccepted={handleFileUploaded} onFileRejected={handleUploadError} />
						) : (
							<>
								<div className="rounded-xl border border-trustTeal/30 bg-gradient-to-r from-trustTeal/5 to-white p-4 shadow-sm">
									<div className="flex items-center justify-between">
										<div className="flex items-center space-x-3">
											<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-trustTeal/20 to-trustTeal/30 shadow-inner">
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="24"
													height="24"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
													className="text-trustTeal"
												>
													<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
													<polyline points="14 2 14 8 20 8" />
												</svg>
											</div>
											<div>
												<p className="max-w-[180px] truncate text-base font-medium text-deepNavy md:max-w-[300px]">
													{selectedFile.name}
												</p>
												<p className="text-sm text-deepNavy/70">
													{formatFileSize(selectedFile.size)}
												</p>
											</div>
										</div>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => setSelectedFile(null)}
											className="h-8 w-8 rounded-full p-0 text-deepNavy/70 hover:bg-warningRed/10 hover:text-warningRed"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="16"
												height="16"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
											>
												<line x1="18" y1="6" x2="6" y2="18"></line>
												<line x1="6" y1="6" x2="18" y2="18"></line>
											</svg>
											<span className="sr-only">Remove file</span>
										</Button>
									</div>
								</div>

								<FormatSelector
									availableFormats={availableFormats}
									selectedFormat={targetFormat}
									onFormatChange={handleFormatChange}
								/>
							</>
						)}
					</div>
				) : currentStep === 'upload' ? (
					<div className="space-y-6 py-4">
						<div className="text-center">
							<h3 className="mb-2 text-lg font-medium text-deepNavy">Uploading File</h3>
							<p className="text-sm text-deepNavy/70">{selectedFile?.name}</p>
						</div>
						<Progress value={uploadProgress} className="h-2 w-full" />
						<p className="text-center text-sm text-deepNavy/70">{uploadProgress}% complete</p>
					</div>
				) : currentStep === 'convert' ? (
					<div className="space-y-6 py-4">
						<div className="text-center">
							<h3 className="mb-2 text-lg font-medium text-deepNavy">Converting File</h3>
							<p className="text-sm text-deepNavy/70">
								{selectedFile?.name} to {targetFormat.toUpperCase()}
							</p>
						</div>
						<Progress value={conversionProgress} className="h-2 w-full" />
						<p className="text-center text-sm text-deepNavy/70">{conversionProgress}% complete</p>
					</div>
				) : (
					<div className="space-y-6 py-4">
						<div className="text-center">
							<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-trustTeal/20 text-trustTeal">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="32"
									height="32"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M22 12h-4l-3 9L9 3l-3 9H2" />
								</svg>
							</div>
							<h3 className="mb-1 text-xl font-medium text-deepNavy">Conversion Complete!</h3>
							<p className="text-sm text-deepNavy/70">
								Your file has been successfully converted and is ready to download.
							</p>
						</div>

						<ConversionStats
							originalFormat={getFileExtension(selectedFile?.name || '')}
							targetFormat={targetFormat}
							fileName={selectedFile?.name || ''}
							fileSize={selectedFile?.size || 0}
						/>
					</div>
				)}
			</CardContent>

			<CardFooter className="flex justify-center border-t border-border/50 bg-gradient-to-b from-lightGray/10 to-lightGray/20 px-8 py-7">
				{currentStep === 'select' ? (
					<Button
						disabled={!selectedFile || !targetFormat || isUploading || isConverting}
						onClick={handleStartConversion}
						className="w-full max-w-xs"
					>
						{isUploading || isConverting ? (
							<>
								<svg
									className="mr-2 h-4 w-4 animate-spin"
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
								Processing...
							</>
						) : (
							<>Convert File</>
						)}
					</Button>
				) : currentStep === 'download' ? (
					<div className="flex w-full max-w-xs flex-col gap-2">
						<Button onClick={handleDownload} className="w-full">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="mr-2"
							>
								<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
								<polyline points="7 10 12 15 17 10" />
								<line x1="12" y1="15" x2="12" y2="3" />
							</svg>
							Download File
						</Button>
						<Button onClick={handleRestart} variant="outline" className="w-full">
							Convert Another File
						</Button>
					</div>
				) : (
					<Button disabled className="w-full max-w-xs">
						<svg
							className="mr-2 h-4 w-4 animate-spin"
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
						{currentStep === 'upload' ? 'Uploading...' : 'Converting...'}
					</Button>
				)}
			</CardFooter>
		</Card>
	)
}

export default ConversionFlow

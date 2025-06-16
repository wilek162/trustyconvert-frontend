import React, { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'sonner'

import { UploadZone } from '@/components/features/upload'
import { FormatSelector, ConversionStats } from '@/components/features/conversion'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { SessionManager } from '@/components/features/session'

import {
	initSession,
	uploadFile,
	convertFile,
	getJobStatus,
	getDownloadToken
} from '@/lib/api/apiClient'

import {
	addJob,
	updateJobStatus,
	updateJobProgress,
	setJobDownloadToken
} from '@/lib/stores/upload'
import { getCSRFToken, getInitialized, setInitializing } from '@/lib/stores/session'
import type { JobStatus } from '@/lib/stores/upload'
import { getFileExtension, formatFileSize } from '@/lib/utils/files'

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
	const [sessionInitialized, setSessionInitialized] = useState(false)

	// Initialize session on component mount
	useEffect(() => {
		const initialize = async () => {
			try {
				// Check if session is already initialized
				if (getInitialized()) {
					setSessionInitialized(true)
					return
				}

				setInitializing(true)
				const response = await initSession()

				if (response.success && response.data.csrf_token) {
					setSessionInitialized(true)
				} else {
					setError('Failed to initialize secure session')
				}
			} catch (error) {
				console.error('Session initialization error:', error)
				setError('Could not establish secure session. Please try refreshing the page.')
			}
		}

		initialize()
	}, [])

	// Handle file upload completion
	const handleFileUploaded = useCallback(
		(jobId: string, file: File) => {
			setSelectedFile(file)
			setJobId(jobId)
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
	}, [initialTargetFormat])

	// Handle format selection
	const handleFormatChange = useCallback((format: string) => {
		setTargetFormat(format)
	}, [])

	// Handle errors from the upload component
	const handleUploadError = useCallback((errorMessage: string) => {
		setError(errorMessage)
	}, [])

	// Start upload and conversion process
	const handleStartConversion = useCallback(async () => {
		if (!selectedFile || !targetFormat) {
			toast.error('Please select a file and target format')
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
			const uploadResponse = await uploadFile(selectedFile, newJobId)

			clearInterval(uploadProgressInterval)
			setUploadProgress(100)

			if (!uploadResponse.success) {
				throw new Error('Upload failed: ' + (uploadResponse.data.message || 'Unknown error'))
			}

			// Update job status to uploaded
			await updateJobStatus(newJobId, 'uploaded')

			// Start conversion
			setIsUploading(false)
			setIsConverting(true)
			setCurrentStep('convert')

			const convertResponse = await convertFile(newJobId, targetFormat)

			if (!convertResponse.success) {
				throw new Error('Conversion failed: ' + (convertResponse.data.message || 'Unknown error'))
			}

			// Update job status to processing
			await updateJobStatus(newJobId, 'processing', {
				taskId: convertResponse.data.task_id
			})

			// Poll for job status
			const pollStatus = async () => {
				try {
					const statusResponse = await getJobStatus(newJobId)

					if (statusResponse.success) {
						const { status, progress = 0 } = statusResponse.data
						setConversionProgress(progress)

						if (status === 'completed') {
							// Get download token
							const downloadTokenResponse = await getDownloadToken(newJobId)

							if (downloadTokenResponse.success) {
								const { download_token } = downloadTokenResponse.data
								await setJobDownloadToken(newJobId, download_token)

								// Set download URL
								setDownloadUrl(
									`${import.meta.env.PUBLIC_API_URL || '/api'}/download?token=${download_token}`
								)
								await updateJobStatus(newJobId, 'completed')

								setIsConverting(false)
								setCurrentStep('download')
								toast.success('File converted successfully!')
							}
							return
						} else if (status === 'failed') {
							throw new Error(statusResponse.data.error_message || 'Conversion failed')
						}

						// Continue polling if still processing
						setTimeout(pollStatus, 1000)
					} else {
						throw new Error('Failed to get job status')
					}
				} catch (error) {
					console.error('Status polling error:', error)
					setError(`Conversion error: ${error instanceof Error ? error.message : 'Unknown error'}`)
					await updateJobStatus(newJobId, 'failed', {
						errorMessage: error instanceof Error ? error.message : 'Unknown error'
					})
					setIsConverting(false)
				}
			}

			// Start polling
			pollStatus()
		} catch (error) {
			console.error('Conversion process error:', error)
			setError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)

			if (jobId) {
				await updateJobStatus(jobId, 'failed', {
					errorMessage: error instanceof Error ? error.message : 'Unknown error'
				})
			}

			setIsUploading(false)
			setIsConverting(false)
		}
	}, [selectedFile, targetFormat])

	// Reset the conversion flow
	const handleReset = useCallback(() => {
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
	}, [initialTargetFormat])

	// Handle session error
	const handleSessionError = useCallback((errorMessage: string) => {
		setError(`Session error: ${errorMessage}`)
	}, [])

	// Show loading state while initializing session
	if (!sessionInitialized) {
		return (
			<div className="flex h-32 items-center justify-center">
				<div className="text-center">
					<svg
						className="mx-auto h-8 w-8 animate-spin text-trustTeal"
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
						/>
					</svg>
					<p className="mt-2 text-sm text-muted-foreground">Setting up secure session...</p>
				</div>
			</div>
		)
	}

	// Handle error state
	if (error) {
		return (
			<Card className="border-warningRed/20 bg-warningRed/5">
				<CardHeader>
					<CardTitle className="text-warningRed">Conversion Error</CardTitle>
				</CardHeader>
				<CardContent>
					<p>{error}</p>
				</CardContent>
				<CardFooter>
					<Button onClick={handleReset} variant="outline">
						Try Again
					</Button>
				</CardFooter>
			</Card>
		)
	}

	return (
		<div className="space-y-6">
			{/* Session management component */}
			<div className="mb-2">
				<SessionManager
					onSessionClosed={handleSessionClosed}
					onSessionError={handleSessionError}
					showExportOption={true}
				/>
			</div>

			{/* Conversion stats - can be hooked up to real data in the future */}
			<ConversionStats
				totalConversions={8526}
				activeConversions={isConverting ? 1 : 0}
				completedToday={12}
			/>

			{/* Main conversion card */}
			<Card className="overflow-hidden border-trustTeal/10 bg-white shadow-lg shadow-trustTeal/5">
				<CardHeader className="border-b border-border/50 pb-4">
					<CardTitle className="text-center text-xl font-semibold text-deepNavy">
						{currentStep === 'select' && (title || 'Select File to Convert')}
						{currentStep === 'upload' && 'Uploading File'}
						{currentStep === 'convert' && 'Converting File'}
						{currentStep === 'download' && 'Download Converted File'}
					</CardTitle>
				</CardHeader>

				<CardContent className="p-6">
					{currentStep === 'select' && (
						<div className="space-y-6">
							<UploadZone
								onFileUploaded={handleFileUploaded}
								onError={handleUploadError}
								initialSourceFormat={initialSourceFormat}
								title={
									initialSourceFormat && initialTargetFormat
										? `Upload your ${initialSourceFormat.toUpperCase()} file to convert to ${initialTargetFormat.toUpperCase()}`
										: 'Select File to Convert'
								}
							/>

							{selectedFile && (
								<>
									<div className="flex items-center justify-between rounded-lg bg-muted/30 p-4">
										<div className="flex items-center gap-3">
											<div className="flex h-10 w-10 items-center justify-center rounded-full bg-trustTeal/10">
												<svg
													xmlns="http://www.w3.org/2000/svg"
													width="18"
													height="18"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
													className="text-trustTeal"
												>
													<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
													<polyline points="13 2 13 9 20 9"></polyline>
												</svg>
											</div>
											<div>
												<p className="text-sm font-medium">{selectedFile.name}</p>
												<p className="text-xs text-muted-foreground">
													{formatFileSize(selectedFile.size)}
												</p>
											</div>
										</div>
										<Button variant="ghost" size="sm" onClick={handleReset}>
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
												className="mr-1"
											>
												<path d="M18 6 6 18"></path>
												<path d="m6 6 12 12"></path>
											</svg>
											Remove
										</Button>
									</div>

									{!initialTargetFormat && (
										<div>
											<h3 className="mb-2 text-sm font-medium">Select Target Format</h3>
											<FormatSelector
												sourceFormat={getFileExtension(selectedFile.name)}
												availableFormats={availableFormats}
												selectedFormat={targetFormat}
												onFormatChange={handleFormatChange}
												disabled={isConverting}
											/>
										</div>
									)}
								</>
							)}
						</div>
					)}

					{currentStep === 'upload' && (
						<div className="space-y-4">
							<div className="flex items-center space-x-3">
								<svg
									className="h-5 w-5 animate-spin text-trustTeal"
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
									/>
								</svg>
								<span>Uploading {selectedFile?.name}...</span>
							</div>
							<Progress value={uploadProgress} className="h-2 w-full" />
							<p className="text-xs text-muted-foreground">
								Your file is being securely uploaded ({uploadProgress}%)
							</p>
						</div>
					)}

					{currentStep === 'convert' && (
						<div className="space-y-4">
							<div className="flex items-center space-x-3">
								<svg
									className="h-5 w-5 animate-spin text-trustTeal"
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
									/>
								</svg>
								<span>
									Converting {selectedFile?.name} to {targetFormat.toUpperCase()}...
								</span>
							</div>
							<Progress value={conversionProgress} className="h-2 w-full" />
							<p className="text-xs text-muted-foreground">
								Please wait while we convert your file ({conversionProgress}%)
							</p>
						</div>
					)}

					{currentStep === 'download' && (
						<div className="space-y-6 text-center">
							<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-successGreen/10">
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
									className="text-successGreen"
								>
									<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
									<polyline points="22 4 12 14.01 9 11.01"></polyline>
								</svg>
							</div>
							<div>
								<h3 className="text-lg font-medium text-deepNavy">Conversion Complete!</h3>
								<p className="mt-1 text-sm text-muted-foreground">
									Your {getFileExtension(selectedFile?.name || '')} file has been successfully
									converted to {targetFormat.toUpperCase()}
								</p>
							</div>
							<div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
								<a
									href={downloadUrl}
									className="inline-flex items-center justify-center rounded-full bg-trustTeal px-6 py-3 text-sm font-medium text-white shadow-md hover:bg-trustTeal/90"
									download={`${selectedFile?.name?.split('.')[0] || 'converted'}.${targetFormat}`}
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
										className="mr-2"
									>
										<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
										<polyline points="7 10 12 15 17 10"></polyline>
										<line x1="12" y1="15" x2="12" y2="3"></line>
									</svg>
									Download File
								</a>
								<Button onClick={handleReset} variant="outline">
									Convert Another File
								</Button>
							</div>
							<p className="mt-4 text-xs text-muted-foreground">
								Your file will be automatically deleted after 24 hours for privacy
							</p>
						</div>
					)}
				</CardContent>

				{currentStep === 'select' && selectedFile && targetFormat && (
					<CardFooter className="flex justify-center border-t border-border/50 bg-gradient-to-b from-white to-lightGray/30 py-6">
						<Button
							onClick={handleStartConversion}
							disabled={!selectedFile || !targetFormat || isUploading || isConverting}
							className="group relative w-full max-w-xs overflow-hidden rounded-full bg-trustTeal px-6 py-3 font-medium text-white hover:bg-trustTeal/90"
						>
							<span className="relative z-10 flex items-center justify-center">
								{isUploading || isConverting ? (
									<>
										<svg
											className="-ml-1 mr-2 h-4 w-4 animate-spin text-white"
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
									<>
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
											<path d="m17 8-10 8"></path>
											<path d="M17 16 7 8"></path>
										</svg>
										Convert Now
									</>
								)}
							</span>
						</Button>
					</CardFooter>
				)}
			</Card>
		</div>
	)
}

export default ConversionFlow

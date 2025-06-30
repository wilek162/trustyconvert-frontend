import React, { useState, useEffect, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'sonner'
import { useToast } from '@/lib/hooks/useToast'
import sessionManager from '@/lib/services/sessionManager'
import jobPollingService from '@/lib/services/jobPollingService'

import { UploadZone } from '@/components/features/upload'
import { FormatSelector } from '@/components/features/conversion/FormatSelector'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { SessionManager } from '@/components/features/session'

import apiClient from '@/lib/api/client'
import {
	addJob,
	updateJobStatus,
	updateJobProgress,
	setJobDownloadToken
} from '@/lib/stores/upload'
import type { JobStatus as ApiJobStatus } from '@/lib/types/api'
import { getFileExtension, formatFileSize } from '@/lib/utils/files'
import { debugLog, debugError } from '@/lib/utils/debug'

// Ensure we're not accessing browser APIs during SSR
const isBrowser = typeof window !== 'undefined'

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
	// Use client-side only rendering to prevent hydration mismatches
	const [isClient, setIsClient] = useState(false)

	// Use effect to set client-side rendering flag
	useEffect(() => {
		setIsClient(true)
	}, [])

	// Session state
	const [isInitialized, setIsInitialized] = useState(false)
	const [isInitializing, setIsInitializing] = useState(false)
	const [sessionError, setSessionError] = useState<string | null>(null)

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
	const [isDownloading, setIsDownloading] = useState(false)

	// Reference to the stop polling function
	const stopPollingRef = useRef<(() => void) | null>(null)

	// Check session status on mount
	useEffect(() => {
		const checkSession = async () => {
			try {
				setIsInitializing(true)
				// Use the debounced init session to prevent multiple calls
				const success = await sessionManager.debouncedInitSession()
				setIsInitialized(success)

				if (!success) {
					setSessionError('Failed to initialize session')
				}
			} catch (err) {
				console.error('Failed to initialize session:', err)
				setSessionError('Failed to initialize session')
			} finally {
				setIsInitializing(false)
			}
		}

		checkSession()
	}, [])

	// Handle session errors
	useEffect(() => {
		if (sessionError) {
			setError(sessionError)
		}
	}, [sessionError])

	// Clean up polling on unmount
	useEffect(() => {
		return () => {
			if (stopPollingRef.current) {
				stopPollingRef.current()
				stopPollingRef.current = null
			}
		}
	}, [])

	// Reset session function
	const resetSession = useCallback(async () => {
		try {
			setIsInitializing(true)
			const success = await sessionManager.resetSession()
			setIsInitialized(success)
			return success
		} catch (err) {
			console.error('Failed to reset session:', err)
			return false
		} finally {
			setIsInitializing(false)
		}
	}, [])

	// Handle restart after error
	const handleRestart = useCallback(() => {
		setError(null)
		resetSession()

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

		// Stop polling if active
		if (stopPollingRef.current) {
			stopPollingRef.current()
			stopPollingRef.current = null
		}
	}, [resetSession, initialTargetFormat])

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

		// Stop polling if active
		if (stopPollingRef.current) {
			stopPollingRef.current()
			stopPollingRef.current = null
		}
	}, [initialTargetFormat])

	// Handle format selection
	const handleFormatChange = useCallback((format: string) => {
		setTargetFormat(format)
	}, [])

	// Handle errors from the upload component
	const handleUploadError = useCallback((errorMessage: string) => {
		setError(errorMessage)
	}, [])

	// Handle conversion button click
	const handleConvert = useCallback(async () => {
		if (!selectedFile || !targetFormat) return

		// First synchronize any existing token from cookie to memory
		sessionManager.synchronizeTokenFromCookie()

		// Ensure we have a session before proceeding
		if (!sessionManager.hasCsrfToken()) {
			// Use local loading state
			const wasConverting = isConverting
			setIsConverting(true)

			try {
				debugLog('ConversionFlow: No session token found, initializing session')
				const success = await sessionManager.initSession()
				if (!success) {
					toast.error('Unable to establish a secure session. Please refresh the page.')
					return
				}
				setIsInitialized(true)
				// Wait a moment for the session to be fully established
				await new Promise((resolve) => setTimeout(resolve, 100))
			} catch (error) {
				console.error('Failed to initialize session:', error)
				toast.error('Session initialization failed. Please refresh the page.')
				return
			} finally {
				// Restore previous state if we weren't already converting
				if (!wasConverting) {
					setIsConverting(false)
				}
			}
		}

		// Double-check that we have a CSRF token
		if (!sessionManager.hasCsrfToken()) {
			toast.error('Unable to secure your session. Please refresh the page.')
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
			debugLog('Starting file upload')
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

			// Stop any existing polling
			if (stopPollingRef.current) {
				stopPollingRef.current()
			}

			// Start polling for job status using the polling service
			startJobPolling(newJobId)
		} catch (error) {
			setIsUploading(false)
			setIsConverting(false)
			setError('Conversion failed. Please try again.')
			console.error('Conversion error:', error)
			toast.error('Conversion failed. Please try again.')
		}
	}, [selectedFile, targetFormat, isConverting])

	// Handle download with debounce
	const handleDownload = useCallback(() => {
		if (isDownloading || !downloadUrl) return

		setIsDownloading(true)
		try {
			debugLog('Manual download initiated with URL:', downloadUrl)

			// Use the recommended approach - browser redirection
			// This is the approach recommended in frontend_download.md
			const a = document.createElement('a')
			a.href = downloadUrl
			a.download = '' // Let the server set the filename
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)

			debugLog('Manual download link clicked')

			// Show toast notification
			toast.success('Your download has started!', {
				description: "If your download doesn't start automatically, please try again."
			})
		} finally {
			// Reset download state after a short delay
			setTimeout(() => {
				setIsDownloading(false)
			}, 1000)
		}
	}, [downloadUrl, isDownloading])

	// Handle job completion
	const handleJobCompleted = useCallback(
		(downloadToken: string, url: string) => {
			debugLog('handleJobCompleted called', { downloadToken, url })

			// Update state to reflect completion
			setDownloadUrl(url)
			setIsConverting(false)
			setCurrentStep('download')

			// Show success toast
			toast.success('File converted successfully!')
			debugLog('State updated: isConverting=false, currentStep=download')

			// Clean up polling
			if (stopPollingRef.current) {
				stopPollingRef.current()
				stopPollingRef.current = null
				debugLog('Polling stopped')
			}

			// Force a state update to ensure React re-renders
			setTimeout(() => {
				// Double-check that we're in the correct state
				if (currentStep !== 'download') {
					debugLog('Forcing state update to download step')
					setCurrentStep('download')
				}
			}, 100)

			// Show notification instead of auto-downloading
			// This prevents using the token twice (once automatically, once manually)
			setTimeout(() => {
				debugLog('Conversion complete, download URL ready:', url)
				try {
					// Show toast notification
					toast.success('Your file is ready for download!', {
						description: 'Click the Download button to get your file.'
					})
				} catch (error) {
					debugError('Error showing download notification:', error)
				}
			}, 500) // Small delay to ensure UI updates first
		},
		[currentStep]
	)

	// Force update the UI state when job is completed
	const forceUpdateToDownloadState = useCallback((token: string, url: string) => {
		debugLog('Forcing update to download state', { token, url })
		setDownloadUrl(url)
		setIsConverting(false)
		setCurrentStep('download')
		setConversionProgress(100)
	}, [])

	// Start polling for job status
	const startJobPolling = useCallback(
		(newJobId: string) => {
			// Clean up any existing polling
			if (stopPollingRef.current) {
				stopPollingRef.current()
				stopPollingRef.current = null
			}

			stopPollingRef.current = jobPollingService.startPolling(newJobId, {
				onProgress: (progress) => {
					setConversionProgress(progress)
				},
				onStatusChange: (status, progress) => {
					debugLog(`Job ${newJobId} status updated to ${status} (${progress}%)`)
					// If status is completed, force update the UI
					if (status === 'completed') {
						debugLog('Status update indicates job is completed')
						// We'll get the download URL from the completion callback
					}
				},
				onCompleted: (downloadToken, downloadUrl) => {
					debugLog('onCompleted callback triggered', { downloadToken, downloadUrl })
					// First force update the UI state
					forceUpdateToDownloadState(downloadToken, downloadUrl)
					// Then call the regular completion handler
					handleJobCompleted(downloadToken, downloadUrl)
				},
				onFailed: (errorMessage) => {
					setIsConverting(false)
					setError(errorMessage || 'Conversion failed')
					toast.error('Conversion failed. Please try again.')
				}
			})
		},
		[handleJobCompleted, forceUpdateToDownloadState]
	)

	// Monitor for completed conversion status and ensure we transition to download state
	useEffect(() => {
		// If we have a download URL but are still in convert step, transition to download step
		if (downloadUrl && currentStep === 'convert' && !isConverting) {
			debugLog(
				'State inconsistency detected: have download URL but still in convert step. Fixing...'
			)
			setCurrentStep('download')
		}
	}, [downloadUrl, currentStep, isConverting])

	// Additional check to force transition to download state if job is completed
	useEffect(() => {
		// If we're still in the converting state but have a jobId, check if it's actually completed
		if (currentStep === 'convert' && isConverting && jobId) {
			const checkJobStatus = async () => {
				try {
					const statusResponse = await apiClient.getConversionStatus(jobId)
					debugLog('Forced status check:', statusResponse)

					if (statusResponse && statusResponse.status === 'completed') {
						debugLog('Force check found job is completed, transitioning to download state')

						// If there's a download token in the response, use it
						if (statusResponse.download_token || statusResponse.downloadToken) {
							const token = statusResponse.download_token || statusResponse.downloadToken
							const url = apiClient.getDownloadUrl(token)

							// Force update state
							setDownloadUrl(url)
							setIsConverting(false)
							setCurrentStep('download')
							setConversionProgress(100)

							// Show success toast
							toast.success('File converted successfully!')
						} else {
							// Request a download token
							try {
								const tokenResponse = await apiClient.getDownloadToken(jobId)
								const token =
									tokenResponse.download_token ||
									tokenResponse.downloadToken ||
									tokenResponse.data?.download_token ||
									tokenResponse.data?.downloadToken

								if (token) {
									const url = apiClient.getDownloadUrl(token)

									// Force update state
									setDownloadUrl(url)
									setIsConverting(false)
									setCurrentStep('download')
									setConversionProgress(100)

									// Show success toast
									toast.success('File converted successfully!')
								}
							} catch (error) {
								debugError('Error getting download token in force check:', error)
							}
						}
					}
				} catch (error) {
					debugError('Error in forced status check:', error)
				}
			}

			// Run the check once after a short delay
			const timeoutId = setTimeout(checkJobStatus, 1000)
			return () => clearTimeout(timeoutId)
		}
	}, [currentStep, isConverting, jobId])

	// If not client-side yet, render a minimal loading state to prevent hydration mismatch
	if (!isClient) {
		return (
			<Card className="mx-auto w-full max-w-3xl overflow-hidden rounded-xl border-0 bg-white shadow-lg">
				<CardHeader className="border-b border-border/50 bg-gradient-to-r from-trustTeal/20 to-transparent pb-4 pt-5">
					<CardTitle className="text-center text-xl font-semibold text-deepNavy">{title}</CardTitle>
				</CardHeader>
				<CardContent className="bg-gradient-to-b from-white to-lightGray/10 p-6">
					<div className="flex flex-col items-center justify-center py-8">
						<div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-trustTeal/20 border-t-trustTeal"></div>
						<p className="text-deepNavy">Loading...</p>
					</div>
				</CardContent>
				<CardFooter className="flex justify-center border-t border-border/50 bg-gradient-to-b from-lightGray/10 to-lightGray/20 px-8 py-7">
					<Button disabled className="w-full max-w-xs">
						Loading...
					</Button>
				</CardFooter>
			</Card>
		)
	}

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
											variant="ghost"
											size="sm"
											onClick={() => setSelectedFile(null)}
											className="text-deepNavy/70 hover:text-deepNavy"
										>
											Change
										</Button>
									</div>
								</div>

								<div className="space-y-4">
									<label className="block text-sm font-medium text-deepNavy">Convert to:</label>
									<FormatSelector
										availableFormats={availableFormats}
										selectedFormat={targetFormat}
										onFormatChange={handleFormatChange}
									/>
								</div>
							</>
						)}
					</div>
				) : currentStep === 'upload' ? (
					<div className="space-y-6">
						<div className="flex items-center justify-between">
							<p className="font-medium text-deepNavy">Uploading file...</p>
							<span className="text-sm text-deepNavy/70">{uploadProgress}%</span>
						</div>
						<Progress value={uploadProgress} className="h-2 w-full" />
						<p className="text-sm text-deepNavy/70">
							Uploading {selectedFile?.name} ({formatFileSize(selectedFile?.size || 0)})
						</p>
					</div>
				) : currentStep === 'convert' ? (
					<div className="space-y-6">
						<div className="flex items-center justify-between">
							<p className="font-medium text-deepNavy">Converting file...</p>
							<span className="text-sm text-deepNavy/70">{conversionProgress}%</span>
						</div>
						<Progress value={conversionProgress} className="h-2 w-full" />
						<p className="text-sm text-deepNavy/70">
							Converting {selectedFile?.name} to {targetFormat}
						</p>
						{/* Add debug information in development mode */}
						{import.meta.env.DEV && (
							<div className="mt-4 rounded border border-yellow-200 bg-yellow-50 p-2 text-xs">
								<p>
									Debug: isConverting={isConverting ? 'true' : 'false'}, currentStep={currentStep}
								</p>
								<p>downloadUrl={downloadUrl ? 'set' : 'not set'}</p>
							</div>
						)}
					</div>
				) : currentStep === 'download' ? (
					<div className="space-y-6">
						<div className="rounded-xl border border-trustTeal/30 bg-gradient-to-r from-trustTeal/5 to-white p-4 shadow-sm">
							<div className="flex items-center justify-between">
								<div className="flex items-center space-x-3">
									<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-green-100 to-green-200 shadow-inner">
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
											className="text-green-600"
										>
											<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
											<polyline points="22 4 12 14.01 9 11.01" />
										</svg>
									</div>
									<div>
										<p className="text-base font-medium text-deepNavy">Conversion Complete!</p>
										<p className="text-sm text-deepNavy/70">
											{selectedFile?.name} → {targetFormat}
										</p>
									</div>
								</div>
							</div>
						</div>
						{/* Add debug information in development mode */}
						{import.meta.env.DEV && (
							<div className="mt-4 rounded border border-green-200 bg-green-50 p-2 text-xs">
								<p>
									Debug: isConverting={isConverting ? 'true' : 'false'}, currentStep={currentStep}
								</p>
								<p>downloadUrl={downloadUrl ? downloadUrl.substring(0, 50) + '...' : 'not set'}</p>
							</div>
						)}
					</div>
				) : (
					<div className="space-y-6">
						<div className="rounded-lg border border-warningRed/20 bg-warningRed/10 p-5 text-center">
							<p className="mb-4 text-warningRed">Unknown conversion state: {currentStep}</p>
							<Button onClick={handleRestart} variant="outline">
								Start Over
							</Button>
						</div>
					</div>
				)}
			</CardContent>

			<CardFooter className="flex justify-center border-t border-border/50 bg-gradient-to-b from-lightGray/10 to-lightGray/20 px-8 py-7">
				{currentStep === 'select' ? (
					<Button
						onClick={handleConvert}
						disabled={!selectedFile || !targetFormat || isInitializing}
						className="w-full max-w-xs"
					>
						Convert Now
					</Button>
				) : currentStep === 'upload' || currentStep === 'convert' ? (
					<Button disabled className="w-full max-w-xs">
						{currentStep === 'upload' ? 'Uploading...' : 'Converting...'}
					</Button>
				) : (
					<Button onClick={handleDownload} disabled={isDownloading} className="w-full max-w-xs">
						{isDownloading ? (
							<>
								<div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
								Starting Download...
							</>
						) : (
							'Download Converted File'
						)}
					</Button>
				)}
			</CardFooter>
		</Card>
	)
}

export default ConversionFlow

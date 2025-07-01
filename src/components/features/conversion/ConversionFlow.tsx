import React, { useState, useEffect, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'

import { UploadZone } from '@/components/features/upload'
import { FormatSelector } from '@/components/features/conversion/FormatSelector'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

import client from '@/lib/api/client'
import { getFileExtension, formatFileSize } from '@/lib/utils/files'
import { debugLog, debugSessionState } from '@/lib/utils/debug'
import CloseSession from '../session/CloseSession'
import { useSession } from '@/lib/providers/SessionContext'
import sessionManager from '@/lib/services/sessionManager'

// Import store hooks
import { useAtomStore } from '@/lib/hooks/useStore'
import {
	conversionStore,
	startConversion,
	updateConversionProgress,
	completeConversion,
	setConversionError,
	resetConversion
} from '@/lib/stores/conversion'

// Import error handling and messaging utilities
import { withErrorHandling } from '@/lib/utils/errorHandling'
import { showSuccess, showError, showInfo, MESSAGE_TEMPLATES } from '@/lib/utils/messageUtils'

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

export function ConversionFlow({
	initialSourceFormat,
	initialTargetFormat,
	title = 'Convert Your File'
}: ConversionFlowProps) {
	// Use conversion store
	const [conversionState, setConversionState] = useAtomStore(conversionStore)

	// Client-side rendering state
	const [isClient, setIsClient] = useState(false)

	// Get session context
	const {
		isInitialized,
		isInitializing,
		ensureSession,
		resetSession,
		lastError,
		detailedError,
		getDebugInfo
	} = useSession()

	// Session error state
	const [sessionError, setSessionError] = useState<string | null>(null)
	const [showDebugInfo, setShowDebugInfo] = useState(false)

	// Conversion flow state
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [targetFormat, setTargetFormat] = useState<string>(initialTargetFormat || '')
	const [availableFormats, setAvailableFormats] = useState<string[]>([])
	const [isUploading, setIsUploading] = useState(false)
	const [isConverting, setIsConverting] = useState(false)
	const [uploadProgress, setUploadProgress] = useState(0)
	const [currentStep, setCurrentStep] = useState<'select' | 'upload' | 'convert' | 'download'>(
		'select'
	)
	const [jobId, setJobId] = useState<string>('')
	const [error, setError] = useState<string | null>(null)

	// Reference to the stop polling function
	const stopPollingRef = useRef<(() => void) | null>(null)

	// Initialize client-side rendering
	useEffect(() => {
		setIsClient(true)
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
		setCurrentStep('select')
		setJobId('')
		setShowDebugInfo(false)

		// Reset conversion store
		resetConversion()

		// Stop polling if active
		if (stopPollingRef.current) {
			stopPollingRef.current()
		}
	}, [resetSession, initialTargetFormat])

	// Handle session errors
	useEffect(() => {
		if (sessionError) {
			setError(sessionError)
			showError(sessionError)
		}
	}, [sessionError])

	// Handle last error from session context
	useEffect(() => {
		if (lastError) {
			debugLog('Session error detected:', lastError)
			setSessionError(lastError)
		}
	}, [lastError])

	// Clean up polling and reset conversion state on unmount
	useEffect(() => {
		return () => {
			if (stopPollingRef.current) {
				stopPollingRef.current()
			}
			resetConversion()
		}
	}, [])

	// Toggle debug info display
	const toggleDebugInfo = useCallback(() => {
		setShowDebugInfo((prev) => !prev)
	}, [])

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
		handleRestart()
	}, [handleRestart])

	// Handle format selection
	const handleFormatChange = useCallback((format: string) => {
		setTargetFormat(format)
	}, [])

	// Handle upload error
	const handleUploadError = useCallback((errorMessage: string) => {
		setError(errorMessage)
		showError(errorMessage)
	}, [])

	// Handle conversion button click with error handling
	const handleConvert = withErrorHandling(async () => {
		if (!selectedFile || !targetFormat) return

		// Ensure we have a session before proceeding
		setIsConverting(true)

		// First check if we already have a valid session
		const hasCsrfToken = sessionManager.hasCsrfToken()
		const isSessionInit = sessionManager.getSessionState().sessionInitialized

		// Log detailed session state for debugging
		if (import.meta.env.DEV) {
			debugSessionState(sessionManager, 'handleConvert - before session check')
		}

		// If we already have a token and session is initialized, proceed without calling ensureSession
		if (hasCsrfToken && isSessionInit) {
			debugLog('Using existing session for conversion')
		} else {
			// Otherwise try to ensure session
			try {
				const success = await ensureSession()
				if (!success) {
					// In development mode, show more detailed error
					if (import.meta.env.DEV) {
						debugSessionState(sessionManager, 'handleConvert - session initialization failed')
						console.group('Session Initialization Failed')
						console.error('Session error details:', getDebugInfo())
						console.log('CSRF token exists:', sessionManager.hasCsrfToken())
						console.log('Session initialized:', sessionManager.getSessionState().sessionInitialized)
						console.log('Last error:', lastError || 'No error message')
						console.groupEnd()

						// Show a more informative error message in development
						const errorMsg =
							lastError || 'Session initialization failed. Check console for details.'
						showError(errorMsg)
						setError(errorMsg)
					} else {
						// In production, show the standard message
						showError(MESSAGE_TEMPLATES.session.invalid)
					}
					setIsConverting(false)
					return
				}
			} catch (error) {
				console.error('Failed to initialize session:', error)

				// Show detailed error in development
				if (import.meta.env.DEV) {
					debugSessionState(sessionManager, 'handleConvert - session initialization error')
					const errorMsg =
						error instanceof Error
							? `Session error: ${error.message}`
							: 'Unknown session error. Check console for details.'
					showError(errorMsg)
					setError(errorMsg)
				} else {
					showError(MESSAGE_TEMPLATES.session.invalid)
				}
				setIsConverting(false)
				return
			}
		}

		// Log session state after initialization
		if (import.meta.env.DEV) {
			debugSessionState(sessionManager, 'handleConvert - after session check')
		}

		// Generate a job ID if we don't have one
		const currentJobId = jobId || uuidv4()
		if (!jobId) {
			setJobId(currentJobId)
		}

		// Start upload process
		setIsUploading(true)
		setCurrentStep('upload')
		setError(null)
		showInfo(MESSAGE_TEMPLATES.upload.started)

		try {
			// Upload the file
			const uploadResponse = await client.uploadFile(selectedFile, currentJobId)

			if (!uploadResponse || !uploadResponse.job_id) {
				throw new Error(MESSAGE_TEMPLATES.upload.failed)
			}

			setUploadProgress(100)
			showSuccess(MESSAGE_TEMPLATES.upload.complete)

			// Start conversion process
			setIsUploading(false)
			setIsConverting(true)
			setCurrentStep('convert')
			showInfo(MESSAGE_TEMPLATES.conversion.started)

			const sourceFormat = getFileExtension(selectedFile.name)
			const convertResponse = await client.convertFile(currentJobId, targetFormat, sourceFormat)

			if (!convertResponse || !convertResponse.job_id) {
				throw new Error(MESSAGE_TEMPLATES.conversion.failed)
			}

			// Initialize conversion in store
			startConversion(currentJobId, selectedFile.name, targetFormat, selectedFile.size)

			// Start polling for status
			const { startPolling } = await import('@/lib/services/jobPollingService')

			stopPollingRef.current = startPolling(currentJobId, {
				onProgress: (progress) => {
					updateConversionProgress(progress)
				},
				onCompleted: (downloadToken, downloadUrl) => {
					setIsConverting(false)
					setCurrentStep('download')
					completeConversion(downloadUrl)
					showSuccess(MESSAGE_TEMPLATES.conversion.complete)
				},
				onFailed: (errorMessage) => {
					setIsConverting(false)
					setError(errorMessage)
					setConversionError(errorMessage)
					showError(errorMessage || MESSAGE_TEMPLATES.conversion.failed)
				}
			})
		} catch (error) {
			setIsUploading(false)
			setIsConverting(false)
			const errorMessage = error instanceof Error ? error.message : String(error)
			setError(errorMessage)
			showError(errorMessage)
		}
	})

	// Format debug info for display
	const getFormattedDebugInfo = useCallback(() => {
		try {
			const sessionState = sessionManager.getSessionState()
			return JSON.stringify(sessionState, null, 2)
		} catch (e) {
			return 'Error formatting debug info'
		}
	}, [])

	// Format error details for display
	const getFormattedErrorDetails = useCallback(() => {
		if (!detailedError) return 'No detailed error information'
		try {
			if (typeof detailedError === 'object') {
				return JSON.stringify(detailedError, null, 2)
			}
			return String(detailedError)
		} catch (e) {
			return `Error formatting details: ${String(e)}`
		}
	}, [detailedError])

	// Render the component
	if (!isClient) {
		return null // Don't render on server
	}

	// Determine current content based on step
	let content
	if (error) {
		content = (
			<div className="flex flex-col items-center justify-center space-y-4 py-8 text-center">
				<div className="rounded-full bg-red-100 p-3">
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
						className="h-6 w-6 text-red-500"
					>
						<circle cx="12" cy="12" r="10" />
						<line x1="12" y1="8" x2="12" y2="12" />
						<line x1="12" y1="16" x2="12.01" y2="16" />
					</svg>
				</div>
				<h3 className="text-lg font-medium text-gray-900">Error</h3>
				<p className="max-w-md text-sm text-gray-500">{error}</p>

				{/* Debug button in development mode */}
				{import.meta.env.DEV && (
					<>
						<button onClick={toggleDebugInfo} className="text-xs text-blue-600 underline">
							{showDebugInfo ? 'Hide Debug Info' : 'Show Debug Info'}
						</button>

						{showDebugInfo && (
							<div className="max-w-md rounded-md bg-gray-100 p-3 text-left">
								<h4 className="mb-2 text-sm font-semibold">Session Debug Info:</h4>
								<div className="mb-2 text-xs text-gray-700">
									<p>
										<strong>Session Initialized:</strong> {String(isInitialized)}
									</p>
									<p>
										<strong>Session Initializing:</strong> {String(isInitializing)}
									</p>
									<p>
										<strong>Has CSRF Token:</strong> {String(sessionManager.hasCsrfToken())}
									</p>
									<p>
										<strong>CSRF Token in Store:</strong> {String(sessionManager.hasCsrfToken())}
									</p>
								</div>
								<h4 className="mb-2 text-sm font-semibold">Session State:</h4>
								<pre className="overflow-auto text-xs text-gray-700">{getFormattedDebugInfo()}</pre>
								{lastError && (
									<div className="mt-2">
										<h4 className="mb-2 text-sm font-semibold">Error Message:</h4>
										<p className="text-xs text-red-600">{lastError}</p>
									</div>
								)}
								{detailedError !== null && detailedError !== undefined && (
									<div className="mt-2">
										<h4 className="mb-2 text-sm font-semibold">Detailed Error:</h4>
										<pre className="overflow-auto text-xs text-red-600">
											{getFormattedErrorDetails()}
										</pre>
									</div>
								)}
								<div className="mt-3 flex justify-center">
									<button
										onClick={() => {
											// Force session initialization
											sessionManager.initSession(true)
										}}
										className="rounded bg-blue-500 px-2 py-1 text-xs text-white"
										disabled={isInitializing}
									>
										{isInitializing ? 'Initializing...' : 'Force Session Init'}
									</button>
								</div>
							</div>
						)}
					</>
				)}

				<Button onClick={handleRestart}>Try Again</Button>
			</div>
		)
	} else if (currentStep === 'select') {
		content = (
			<div className="space-y-6">
				<UploadZone onFileAccepted={handleFileUploaded} onFileRejected={handleUploadError} />
				{selectedFile && (
					<>
						<div className="rounded-lg bg-gray-50 p-4">
							<p className="text-sm font-medium text-gray-700">
								Selected file: {selectedFile.name}
							</p>
							<p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
						</div>
						{availableFormats.length > 0 ? (
							<>
								<FormatSelector
									sourceFormat={getFileExtension(selectedFile.name)}
									selectedFormat={targetFormat}
									availableFormats={availableFormats}
									onFormatChange={handleFormatChange}
								/>
								<Button
									onClick={handleConvert}
									disabled={!targetFormat || isInitializing}
									className="w-full"
								>
									{isInitializing ? 'Initializing...' : 'Convert Now'}
								</Button>
							</>
						) : (
							<div className="rounded-lg bg-amber-50 p-4 text-center">
								<p className="text-sm text-amber-800">
									Sorry, we don't support conversion for this file type yet.
								</p>
							</div>
						)}
					</>
				)}
			</div>
		)
	} else if (currentStep === 'upload') {
		content = (
			<div className="space-y-6">
				<div className="text-center">
					<h3 className="mb-2 text-lg font-medium">Uploading File</h3>
					<p className="text-sm text-gray-600">{selectedFile?.name}</p>
				</div>
				<Progress value={uploadProgress} className="h-2 w-full" />
				<div className="flex items-center justify-between">
					<p className="text-sm text-gray-600">Uploading securely...</p>
					<p className="text-sm font-medium">{Math.round(uploadProgress)}%</p>
				</div>
			</div>
		)
	} else if (currentStep === 'convert') {
		content = (
			<div className="space-y-6">
				<div className="text-center">
					<h3 className="mb-2 text-lg font-medium">Converting File</h3>
					<p className="text-sm text-gray-600">
						{selectedFile?.name} to {targetFormat.toUpperCase()}
					</p>
				</div>
				<Progress value={conversionState.progress} className="h-2 w-full" />
				<div className="flex items-center justify-between">
					<p className="text-sm text-gray-600">Converting format...</p>
					<p className="text-sm font-medium">{Math.round(conversionState.progress)}%</p>
				</div>
				{conversionState.progress > 0 && conversionState.progress < 100 && (
					<div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
						<p>
							Your file is being processed securely. This may take a few moments depending on file
							size.
						</p>
					</div>
				)}
			</div>
		)
	} else if (currentStep === 'download') {
		content = (
			<div className="space-y-6">
				<div className="mx-auto w-fit rounded-full bg-green-100 p-3">
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
						className="h-6 w-6 text-green-500"
					>
						<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
						<polyline points="22 4 12 14.01 9 11.01" />
					</svg>
				</div>
				<div className="text-center">
					<h3 className="text-lg font-medium">Conversion Complete!</h3>
					<p className="mt-1 text-sm text-gray-600">Your file has been successfully converted</p>
				</div>
				<div className="rounded-lg bg-gray-50 p-4">
					<p className="text-sm font-medium">
						{selectedFile?.name} → {selectedFile?.name.split('.')[0]}.{targetFormat}
					</p>
				</div>
				<div className="flex flex-col space-y-3">
					<Button asChild className="w-full">
						<a href={conversionState.resultUrl} download target="_blank" rel="noopener noreferrer">
							Download Converted File
						</a>
					</Button>
					<Button variant="outline" onClick={handleRestart} className="w-full">
						Convert Another File
					</Button>
				</div>
				<CloseSession onSessionClosed={handleSessionClosed} />
			</div>
		)
	}

	return (
		<Card className="mx-auto w-full max-w-md">
			<CardHeader>
				<CardTitle className="text-center">{title}</CardTitle>
			</CardHeader>
			<CardContent>{content}</CardContent>
			{(isUploading || isConverting) && (
				<CardFooter className="flex justify-center">
					<p className="text-xs text-gray-500">Please don't close this window</p>
				</CardFooter>
			)}
		</Card>
	)
}

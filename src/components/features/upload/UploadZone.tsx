import React, { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

import { FILE_UPLOAD } from '@/lib/config/constants'
import { validateFile, type FileValidationResult } from './FileValidation'
import { useFileUpload } from '@/lib/hooks/useApi'
import { addJob, updateJobStatus, updateJobProgress } from '@/lib/stores/upload'
import { getCSRFToken } from '@/lib/stores/session'
import { getFileInfo } from '@/lib/utils/files'
import { mockFormats } from '@/mocks/data'

interface UploadZoneProps {
	onFileUploaded?: (jobId: string, file: File) => void
	onError?: (error: string) => void
	maxFileSize?: number
	acceptedFormats?: Record<string, string[]>
	initialSourceFormat?: string
	className?: string
	showProgress?: boolean
	title?: string
}

// Define progress event type
interface ProgressEvent {
	loaded: number
	total?: number
}

export function UploadZone({
	onFileUploaded,
	onError,
	maxFileSize = FILE_UPLOAD.MAX_SIZE,
	acceptedFormats: propAcceptedFormats,
	initialSourceFormat,
	className = '',
	showProgress = true,
	title = 'Upload File'
}: UploadZoneProps) {
	const [file, setFile] = useState<File | null>(null)
	const [validationResult, setValidationResult] = useState<FileValidationResult | null>(null)
	const [uploadProgress, setUploadProgress] = useState(0)
	const [isUploading, setIsUploading] = useState(false)
	const [filteredFormats, setFilteredFormats] = useState<Record<string, string[]>>(
		propAcceptedFormats || FILE_UPLOAD.MIME_TYPES
	)

	// Filter accepted formats based on initialSourceFormat
	useEffect(() => {
		if (initialSourceFormat) {
			// Find the format info from mock data
			const formatInfo = mockFormats.find((format) => format.id === initialSourceFormat)

			if (formatInfo && formatInfo.mimeTypes && formatInfo.extensions) {
				// Create a filtered format object that only includes the specified source format
				const filtered: Record<string, string[]> = {}

				// Add MIME types
				formatInfo.mimeTypes.forEach((mimeType) => {
					filtered[mimeType] = formatInfo.extensions || []
				})

				setFilteredFormats(filtered)
			}
		} else {
			// Use the props or default if no initialSourceFormat is provided
			setFilteredFormats(propAcceptedFormats || FILE_UPLOAD.MIME_TYPES)
		}
	}, [initialSourceFormat, propAcceptedFormats])

	// Use the file upload mutation
	const uploadMutation = useFileUpload({
		onSuccess: (response, variables) => {
			if (response.success) {
				setUploadProgress(100)
				setIsUploading(false)

				if (onFileUploaded && file) {
					onFileUploaded(variables.jobId, file)
				}

				toast.success('File uploaded successfully')
			} else {
				handleError('Upload failed: ' + (response.data?.message || 'Unknown error'))
			}
		},
		onError: (error) => {
			handleError('Upload failed: ' + (error.message || 'Unknown error'))
		}
	})

	// Handle upload errors
	const handleError = (message: string) => {
		setIsUploading(false)
		setUploadProgress(0)

		toast.error(message)

		if (onError) {
			onError(message)
		}
	}

	// Handle file drop
	const onDrop = useCallback(
		async (acceptedFiles: File[]) => {
			// Reset state
			setFile(null)
			setValidationResult(null)
			setUploadProgress(0)

			// No files
			if (acceptedFiles.length === 0) {
				return
			}

			const selectedFile = acceptedFiles[0]

			// Validate file
			const result = validateFile(selectedFile, {
				maxSize: maxFileSize,
				allowedTypes: Object.values(filteredFormats).flat()
			})

			setValidationResult(result)

			if (!result.isValid) {
				if (result.error && onError) {
					onError(result.error)
				}
				return
			}

			setFile(selectedFile)
		},
		[maxFileSize, filteredFormats, onError]
	)

	// Configure dropzone
	const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
		onDrop,
		accept: filteredFormats,
		maxFiles: 1,
		maxSize: maxFileSize,
		multiple: false
	})

	// Start file upload
	const handleUpload = async () => {
		if (!file) return

		// Check if session is initialized
		const csrfToken = getCSRFToken()
		if (!csrfToken) {
			handleError('Session not initialized. Please refresh the page.')
			return
		}

		// Generate job ID
		const jobId = uuidv4()

		// Add job to store
		await addJob({
			jobId,
			originalFilename: file.name,
			targetFormat: '', // Will be set during conversion
			status: 'uploading',
			uploadProgress: 0,
			fileSize: file.size,
			mimeType: file.type,
			createdAt: new Date().toISOString()
		})

		// Start upload
		setIsUploading(true)
		setUploadProgress(0)

		// Set up progress tracking
		const updateProgress = (progress: number) => {
			setUploadProgress(progress)
			updateJobProgress(jobId, progress)
		}

		// Use the mutation with manual progress tracking
		uploadMutation.mutate({ file, jobId })

		// Since the API client doesn't support progress events directly,
		// we'll simulate progress for better UX
		const progressInterval = setInterval(() => {
			setUploadProgress((prev) => {
				// Only update if still uploading and less than 95%
				if (isUploading && prev < 95) {
					const newProgress = Math.min(prev + 5, 95)
					updateJobProgress(jobId, newProgress)
					return newProgress
				}
				return prev
			})
		}, 300)

		// Clear interval when component unmounts or upload completes
		return () => clearInterval(progressInterval)
	}

	// Reset and try again
	const handleReset = () => {
		setFile(null)
		setValidationResult(null)
		setUploadProgress(0)
		setIsUploading(false)
	}

	// Get format-specific message
	const getFormatMessage = () => {
		if (initialSourceFormat) {
			const formatInfo = mockFormats.find((format) => format.id === initialSourceFormat)
			if (formatInfo) {
				return `Upload a ${formatInfo.name} file`
			}
		}
		return 'Drag & drop a file here, or click to select'
	}

	return (
		<Card className={`overflow-hidden ${className}`}>
			<CardHeader className="bg-muted/50 pb-2">
				<CardTitle className="text-lg font-medium">{title}</CardTitle>
			</CardHeader>

			<CardContent className="pt-4">
				{/* File dropzone */}
				<div
					{...getRootProps()}
					className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors
            ${isDragActive ? 'border-trustTeal bg-trustTeal/5' : 'border-border hover:border-muted-foreground'}
            ${isDragReject || (validationResult && !validationResult.isValid) ? 'border-warningRed bg-warningRed/5' : ''}
            ${isUploading ? 'pointer-events-none opacity-60' : ''}
          `}
				>
					<input {...getInputProps()} disabled={isUploading} />

					{file ? (
						<div className="space-y-2">
							<div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
									<polyline points="13 2 13 9 20 9"></polyline>
								</svg>
							</div>
							<p className="font-medium">{file.name}</p>
							<p className="text-sm text-muted-foreground">{getFileInfo(file).size}</p>
						</div>
					) : (
						<div className="space-y-2">
							<div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
									<polyline points="17 8 12 3 7 8"></polyline>
									<line x1="12" y1="3" x2="12" y2="15"></line>
								</svg>
							</div>
							<p className="font-medium">
								{isDragActive ? 'Drop the file here' : getFormatMessage()}
							</p>
							<p className="text-sm text-muted-foreground">
								Max file size: {Math.round(maxFileSize / (1024 * 1024))} MB
								{initialSourceFormat && <span> | Format: {initialSourceFormat.toUpperCase()}</span>}
							</p>
						</div>
					)}
				</div>

				{/* Error message */}
				{validationResult && !validationResult.isValid && validationResult.error && (
					<div className="mt-3 rounded-md border border-warningRed/20 bg-warningRed/10 p-2 text-sm text-warningRed">
						{validationResult.error}
					</div>
				)}

				{/* Upload progress */}
				{isUploading && showProgress && (
					<div className="mt-4 space-y-2">
						<div className="flex justify-between text-xs">
							<span>Uploading...</span>
							<span>{uploadProgress}%</span>
						</div>
						<Progress value={uploadProgress} />
					</div>
				)}
			</CardContent>

			<CardFooter className="flex justify-end space-x-2 bg-muted/30 px-6 py-4">
				{file && (
					<Button
						variant="outline"
						size="sm"
						type="button"
						onClick={handleReset}
						disabled={isUploading}
					>
						Change File
					</Button>
				)}

				{file && !isUploading && validationResult?.isValid && (
					<Button
						variant="default"
						size="sm"
						type="button"
						onClick={handleUpload}
						disabled={isUploading}
					>
						Upload File
					</Button>
				)}
			</CardFooter>
		</Card>
	)
}

export default UploadZone

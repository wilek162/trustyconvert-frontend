import React, { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { v4 as uuidv4 } from 'uuid'
import { getCSRFToken } from '@/lib/stores/session'
import { uploadFile } from '@/lib/api/apiClient'
import { apiConfig } from '@/lib/api/config'
import { sessionManager } from '@/lib/api/sessionManager'
import { addJob, updateJobStatus, updateJobProgress } from '@/lib/stores/upload'
import type { FileUploadData, JobStatus } from '@/lib/stores/upload'

// Supported MIME types and their extensions
const SUPPORTED_FORMATS = {
	'application/pdf': ['.pdf'],
	'image/jpeg': ['.jpg', '.jpeg'],
	'image/png': ['.png'],
	'image/gif': ['.gif'],
	'image/svg+xml': ['.svg'],
	'application/msword': ['.doc'],
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
	'application/vnd.ms-excel': ['.xls'],
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
	'application/vnd.ms-powerpoint': ['.ppt'],
	'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
	'text/plain': ['.txt'],
	'text/html': ['.html', '.htm'],
	'text/css': ['.css'],
	'text/javascript': ['.js'],
	'application/json': ['.json'],
	'application/xml': ['.xml']
}

// Maximum file size (100MB)
const MAX_FILE_SIZE = 100 * 1024 * 1024

interface FileUploadZoneProps {
	onFileUploaded?: (jobId: string) => void
	maxFileSize?: number
	acceptedFormats?: Record<string, string[]>
}

export function FileUploadZone({
	onFileUploaded,
	maxFileSize = MAX_FILE_SIZE,
	acceptedFormats = SUPPORTED_FORMATS
}: FileUploadZoneProps) {
	const [error, setError] = useState<string | null>(null)
	const [isUploading, setIsUploading] = useState(false)
	const [uploadProgress, setUploadProgress] = useState(0)
	const [currentFile, setCurrentFile] = useState<File | null>(null)
	const [jobId, setJobId] = useState<string | null>(null)

	// Reset state when component unmounts
	useEffect(() => {
		return () => {
			setError(null)
			setIsUploading(false)
			setUploadProgress(0)
			setCurrentFile(null)
			setJobId(null)
		}
	}, [])

	// Handle file validation and upload
	const onDrop = useCallback(
		async (acceptedFiles: File[], rejectedFiles: any[]) => {
			// Clear previous errors
			setError(null)

			// Handle rejected files
			if (rejectedFiles.length > 0) {
				const rejection = rejectedFiles[0]
				if (rejection.errors[0].code === 'file-too-large') {
					setError(`File is too large. Maximum size is ${maxFileSize / (1024 * 1024)}MB.`)
				} else if (rejection.errors[0].code === 'file-invalid-type') {
					setError('File type not supported. Please upload a supported file format.')
				} else {
					setError('Invalid file. Please try again.')
				}
				return
			}

			// Handle accepted files
			if (acceptedFiles.length > 0) {
				const file = acceptedFiles[0]

				// Double check file size (redundant but safe)
				if (file.size > maxFileSize) {
					setError(`File is too large. Maximum size is ${maxFileSize / (1024 * 1024)}MB.`)
					return
				}

				// Set current file
				setCurrentFile(file)

				// Generate job ID
				const newJobId = uuidv4()
				setJobId(newJobId)

				// Create upload job
				const job: FileUploadData = {
					jobId: newJobId,
					originalFilename: file.name,
					targetFormat: '', // Will be set later
					status: 'idle',
					uploadProgress: 0,
					fileSize: file.size,
					mimeType: file.type,
					createdAt: new Date().toISOString()
				}

				// Add job to store
				await addJob(job)

				// Start upload automatically
				handleUpload(file, newJobId)
			}
		},
		[maxFileSize]
	)

	// Configure dropzone
	const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
		onDrop,
		accept: acceptedFormats,
		maxFiles: 1,
		maxSize: maxFileSize,
		multiple: false
	})

	// Handle file upload with progress tracking
	const handleUpload = async (file: File, jobId: string) => {
		// Ensure we have a valid session and CSRF token
		let csrfToken = getCSRFToken()
		if (!csrfToken) {
			try {
				// Attempt to initialize session (or wait if already initializing)
				await sessionManager.initialize()
			} catch (initError) {
				console.error('Failed to initialize session before upload', initError)
			}

			// Re-check token after initialization attempt
			csrfToken = getCSRFToken()

			if (!csrfToken) {
				setError('Session could not be initialized. Please refresh the page and try again.')
				await updateJobStatus(jobId, 'failed', { errorMessage: 'Session not initialized' })
				return
			}
		}

		try {
			setIsUploading(true)
			await updateJobStatus(jobId, 'uploading')

			// Create XHR for progress tracking
			const xhr = new XMLHttpRequest()
			const formData = new FormData()
			formData.append('file', file)
			formData.append('job_id', jobId)

			// Track upload progress
			xhr.upload.addEventListener('progress', (event) => {
				if (event.lengthComputable) {
					const progress = Math.round((event.loaded / event.total) * 100)
					setUploadProgress(progress)
					updateJobProgress(jobId, progress)
				}
			})

			// Handle upload completion
			const uploadPromise = new Promise<any>((resolve, reject) => {
				xhr.onload = () => {
					if (xhr.status >= 200 && xhr.status < 300) {
						try {
							const response = JSON.parse(xhr.responseText)
							resolve(response)
						} catch (error) {
							reject(new Error('Invalid response format'))
						}
					} else {
						reject(new Error(`HTTP Error: ${xhr.status}`))
					}
				}
				xhr.onerror = () => reject(new Error('Network error'))
			})

			// Configure request
			// Use centralized API config for the upload URL
			const uploadUrl = `${apiConfig.baseUrl}${apiConfig.endpoints.upload}`
			xhr.open('POST', uploadUrl, true)
			xhr.setRequestHeader(apiConfig.csrfTokenHeader, csrfToken)
			xhr.withCredentials = true
			xhr.send(formData)

			// Wait for upload to complete
			const response = await uploadPromise

			if (response.success) {
				await updateJobStatus(jobId, 'uploaded')
				setIsUploading(false)
				setUploadProgress(100)

				// Notify parent component
				if (onFileUploaded) {
					onFileUploaded(jobId)
				}
			} else {
				throw new Error(response.data?.message || 'Upload failed')
			}
		} catch (error) {
			console.error('Upload error:', error)
			setError('Failed to upload file. Please try again.')
			await updateJobStatus(jobId, 'failed', {
				errorMessage: error instanceof Error ? error.message : 'Unknown error'
			})
			setIsUploading(false)
		}
	}

	// Retry upload
	const handleRetry = () => {
		setError(null)
		setUploadProgress(0)

		if (currentFile && jobId) {
			handleUpload(currentFile, jobId)
		}
	}

	return (
		<div className="w-full">
			{/* Dropzone */}
			<div
				{...getRootProps()}
				className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors
          ${isDragActive && !isDragReject ? 'border-blue-500 bg-blue-50' : ''}
          ${isDragReject ? 'border-red-500 bg-red-50' : ''}
          ${!isDragActive && !isDragReject ? 'border-gray-300 hover:border-gray-400' : ''}
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
			>
				<input {...getInputProps()} disabled={isUploading} />

				{isUploading ? (
					<div className="flex flex-col items-center">
						<div className="mb-2 text-blue-600">
							<svg
								className="h-8 w-8 animate-spin"
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
						<p className="font-medium">Uploading {currentFile?.name}</p>
						<div className="mt-2 h-2.5 w-full rounded-full bg-gray-200">
							<div
								className="h-2.5 rounded-full bg-blue-600"
								style={{ width: `${uploadProgress}%` }}
							></div>
						</div>
						<p className="mt-1 text-sm text-gray-500">{uploadProgress}%</p>
					</div>
				) : currentFile ? (
					<div>
						<p className="font-medium">{currentFile.name}</p>
						<p className="text-sm text-gray-500">
							{(currentFile.size / (1024 * 1024)).toFixed(2)} MB
						</p>
						<p className="mt-2 text-sm text-green-600">File ready for conversion</p>
					</div>
				) : (
					<div>
						<div className="mb-3 text-gray-400">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="mx-auto h-12 w-12"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
								/>
							</svg>
						</div>
						<p className="font-medium">Drag & drop a file here, or click to select</p>
						<p className="mt-1 text-sm text-gray-500">
							Max file size: {maxFileSize / (1024 * 1024)}MB
						</p>
						<p className="mt-3 text-xs text-gray-400">
							Supported formats: PDF, DOCX, XLSX, PPTX, JPG, PNG, and more
						</p>
					</div>
				)}
			</div>

			{/* Error message */}
			{error && (
				<div className="mt-4 flex items-start rounded-md border border-red-200 bg-red-50 p-3 text-red-700">
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
							Retry Upload
						</button>
					</div>
				</div>
			)}
		</div>
	)
}

export default FileUploadZone

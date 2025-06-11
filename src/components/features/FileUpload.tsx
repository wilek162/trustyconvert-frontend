import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useQuery } from '@tanstack/react-query'
import { v4 as uuidv4 } from 'uuid'

import { uploadFile, convertFile, getJobStatus } from '@/lib/api/apiClient'
import { getCSRFToken } from '@/lib/stores/session'

// File upload component props
interface FileUploadProps {
	onConversionComplete?: (jobId: string) => void
	maxFileSize?: number // in bytes
	acceptedFormats?: Record<string, string[]>
}

export function FileUpload({
	onConversionComplete,
	maxFileSize = 100 * 1024 * 1024, // 100MB default
	acceptedFormats = {
		'application/pdf': ['.pdf'],
		'image/jpeg': ['.jpg', '.jpeg'],
		'image/png': ['.png'],
		'application/msword': ['.doc'],
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
	}
}: FileUploadProps) {
	const [file, setFile] = useState<File | null>(null)
	const [jobId, setJobId] = useState<string | null>(null)
	const [targetFormat, setTargetFormat] = useState<string>('pdf')
	const [uploadStatus, setUploadStatus] = useState<
		'idle' | 'uploading' | 'uploaded' | 'converting' | 'error'
	>('idle')
	const [errorMessage, setErrorMessage] = useState<string | null>(null)

	// Handle file drop
	const onDrop = useCallback(
		(acceptedFiles: File[]) => {
			if (acceptedFiles.length > 0) {
				const selectedFile = acceptedFiles[0]

				// Validate file size
				if (selectedFile.size > maxFileSize) {
					setErrorMessage(`File too large. Maximum size: ${maxFileSize / (1024 * 1024)}MB`)
					return
				}

				setFile(selectedFile)
				setErrorMessage(null)
			}
		},
		[maxFileSize]
	)

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: acceptedFormats,
		maxFiles: 1
	})

	// Handle file upload
	const handleUpload = async () => {
		if (!file) return

		// Check if session is initialized
		const csrfToken = getCSRFToken()
		if (!csrfToken) {
			setErrorMessage('Session not initialized. Please refresh the page.')
			return
		}

		try {
			setUploadStatus('uploading')

			// Generate job ID
			const newJobId = uuidv4()
			setJobId(newJobId)

			// Upload file
			const uploadResponse = await uploadFile(file, newJobId)

			if (uploadResponse.success) {
				setUploadStatus('uploaded')
			} else {
				throw new Error('Upload failed')
			}
		} catch (error) {
			console.error('Upload error:', error)
			setUploadStatus('error')
			setErrorMessage('Failed to upload file. Please try again.')
		}
	}

	// Handle file conversion
	const handleConvert = async () => {
		if (!jobId || !targetFormat) return

		try {
			setUploadStatus('converting')

			const convertResponse = await convertFile(jobId, targetFormat)

			if (!convertResponse.success) {
				throw new Error('Conversion failed')
			}

			// Start polling for job status
			refetch()
		} catch (error) {
			console.error('Conversion error:', error)
			setUploadStatus('error')
			setErrorMessage('Failed to convert file. Please try again.')
		}
	}

	// Poll for job status
	const { data: jobStatus, refetch } = useQuery({
		queryKey: ['jobStatus', jobId],
		queryFn: () => (jobId ? getJobStatus(jobId) : Promise.resolve(null)),
		enabled: !!jobId && uploadStatus === 'converting',
		refetchInterval: (data) => {
			if (!data || data.data.status === 'completed' || data.data.status === 'failed') {
				return false
			}
			return 3000 // Poll every 3 seconds
		},
		onSuccess: (data) => {
			if (data?.data.status === 'completed' && onConversionComplete && jobId) {
				onConversionComplete(jobId)
			} else if (data?.data.status === 'failed') {
				setUploadStatus('error')
				setErrorMessage(data.data.error_message || 'Conversion failed')
			}
		}
	})

	return (
		<div className="mx-auto w-full max-w-md">
			{/* File drop zone */}
			<div
				{...getRootProps()}
				className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
			>
				<input {...getInputProps()} />
				{file ? (
					<div>
						<p className="font-medium">{file.name}</p>
						<p className="text-sm text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
					</div>
				) : (
					<div>
						<p className="font-medium">Drag & drop a file here, or click to select</p>
						<p className="text-sm text-gray-500">Max file size: {maxFileSize / (1024 * 1024)}MB</p>
					</div>
				)}
			</div>

			{/* Format selection */}
			{file && uploadStatus === 'idle' && (
				<div className="mt-4">
					<label className="mb-1 block text-sm font-medium text-gray-700">Convert to:</label>
					<select
						value={targetFormat}
						onChange={(e) => setTargetFormat(e.target.value)}
						className="w-full rounded-md border border-gray-300 p-2"
					>
						<option value="pdf">PDF</option>
						<option value="docx">DOCX</option>
						<option value="jpg">JPG</option>
						<option value="png">PNG</option>
					</select>
				</div>
			)}

			{/* Error message */}
			{errorMessage && (
				<div className="mt-4 rounded-md border border-red-200 bg-red-50 p-2 text-red-700">
					{errorMessage}
				</div>
			)}

			{/* Action buttons */}
			<div className="mt-4 flex gap-2">
				{file && uploadStatus === 'idle' && (
					<button
						onClick={handleUpload}
						className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
					>
						Upload
					</button>
				)}

				{uploadStatus === 'uploaded' && (
					<button
						onClick={handleConvert}
						className="flex-1 rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
					>
						Convert to {targetFormat.toUpperCase()}
					</button>
				)}

				{uploadStatus === 'converting' && (
					<div className="w-full rounded-md border border-blue-200 bg-blue-50 p-2 text-center text-blue-700">
						Converting... {jobStatus?.data.status === 'processing' ? 'Processing' : 'Initializing'}
					</div>
				)}
			</div>
		</div>
	)
}

export default FileUpload

import React, { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'

import { FILE_UPLOAD } from '@/lib/config/constants'
import { validateFile, type FileValidationResult } from './FileValidation'
import { getFileInfo } from '@/lib/utils/files'

interface UploadZoneProps {
	onFileAccepted?: (file: File) => void
	onFileRejected?: (error: string) => void
	maxFileSize?: number
	acceptedFormats?: Record<string, string[]>
	initialSourceFormat?: string
	className?: string
	title?: string
}

export function UploadZone({
	onFileAccepted,
	onFileRejected,
	maxFileSize = FILE_UPLOAD.MAX_SIZE,
	acceptedFormats: propAcceptedFormats,
	initialSourceFormat,
	className = '',
	title = 'Upload Your File'
}: UploadZoneProps) {
	const [file, setFile] = useState<File | null>(null)
	const [validationResult, setValidationResult] = useState<FileValidationResult | null>(null)
	const [filteredFormats, setFilteredFormats] = useState<Record<string, string[]>>(
		propAcceptedFormats || FILE_UPLOAD.MIME_TYPES
	)

	// Filter accepted formats based on initialSourceFormat
	useEffect(() => {
		if (initialSourceFormat) {
			// Find the format info from constants
			const formatKey = Object.keys(FILE_UPLOAD.MIME_TYPES).find((key) =>
				FILE_UPLOAD.MIME_TYPES[key].some((type) => type.includes(initialSourceFormat.toLowerCase()))
			)

			if (formatKey) {
				const filteredTypes = {
					[formatKey]: FILE_UPLOAD.MIME_TYPES[formatKey]
				}
				setFilteredFormats(filteredTypes)
			} else {
				setFilteredFormats(propAcceptedFormats || FILE_UPLOAD.MIME_TYPES)
			}
		} else {
			// Use the props or default if no initialSourceFormat is provided
			setFilteredFormats(propAcceptedFormats || FILE_UPLOAD.MIME_TYPES)
		}
	}, [initialSourceFormat, propAcceptedFormats])

	// Handle file drop
	const onDrop = useCallback(
		async (acceptedFiles: File[]) => {
			// Reset state
			setFile(null)
			setValidationResult(null)

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
				if (result.error && onFileRejected) {
					onFileRejected(result.error)
				}
				toast.error(result.error || 'Invalid file')
				return
			}

			setFile(selectedFile)

			// Notify parent component
			if (onFileAccepted) {
				onFileAccepted(selectedFile)
			}
		},
		[maxFileSize, filteredFormats, onFileRejected, onFileAccepted]
	)

	// Configure dropzone
	const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
		onDrop,
		accept: filteredFormats,
		maxFiles: 1,
		maxSize: maxFileSize,
		multiple: false
	})

	// Get format-specific message
	const getFormatMessage = () => {
		if (initialSourceFormat) {
			return `Upload a ${initialSourceFormat.toUpperCase()} file`
		}
		return 'Drag & drop a file here, or click to select'
	}

	return (
		<div className={className}>
			<div
				{...getRootProps()}
				className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors
					${isDragActive ? 'border-trustTeal bg-trustTeal/5' : 'border-gray-200 hover:border-trustTeal/50'}
					${isDragReject || (validationResult && !validationResult.isValid) ? 'border-warningRed bg-warningRed/5' : ''}
				`}
			>
				<input {...getInputProps()} />

				<div className="flex flex-col items-center justify-center space-y-4">
					<div className="rounded-full bg-trustTeal/10 p-3">
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
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
							<polyline points="17 8 12 3 7 8" />
							<line x1="12" y1="3" x2="12" y2="15" />
						</svg>
					</div>

					<div className="space-y-2">
						<h3 className="text-lg font-medium text-deepNavy">{title}</h3>
						<p className="text-sm text-deepNavy/70">{getFormatMessage()}</p>
						<p className="text-xs text-deepNavy/60">
							Max file size: {(maxFileSize / 1024 / 1024).toFixed(0)} MB
						</p>
					</div>

					{validationResult && !validationResult.isValid && (
						<div className="mt-2 text-sm text-warningRed">{validationResult.error}</div>
					)}
				</div>
			</div>
		</div>
	)
}

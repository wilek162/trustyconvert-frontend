import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { useDropzone } from 'react-dropzone'
import type { FileRejection, DropEvent, Accept, FileError } from 'react-dropzone'
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

/**
 * Convert format categories to a proper accept object for react-dropzone
 * Maps extensions to their MIME types
 */
const convertFormatsToAccept = (formats: Record<string, string[]>): Accept => {
	// Create an object that maps MIME types to extensions as required by react-dropzone v14+
	const acceptObject: Accept = {}

	// For each category (DOCUMENT, IMAGE, etc.)
	Object.entries(formats).forEach(([category, extensions]) => {
		// Get the corresponding MIME types for this category
		const mimeTypes = FILE_UPLOAD.MIME_TYPES[category as keyof typeof FILE_UPLOAD.MIME_TYPES] || []

		// For each MIME type, add the extensions
		mimeTypes.forEach((mimeType) => {
			// Format extensions with dots (e.g., '.pdf')
			const formattedExtensions = extensions.map((ext) => `.${ext}`)

			// Add or append to the acceptObject
			if (acceptObject[mimeType]) {
				acceptObject[mimeType] = [...acceptObject[mimeType], ...formattedExtensions]
			} else {
				acceptObject[mimeType] = formattedExtensions
			}
		})
	})

	return acceptObject
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
	// Track if we're rendering on the client to prevent hydration issues
	const [isClient, setIsClient] = useState(false)
	const [file, setFile] = useState<File | null>(null)
	const [validationResult, setValidationResult] = useState<FileValidationResult | null>(null)
	const [filteredFormats, setFilteredFormats] = useState<Record<string, string[]>>(
		propAcceptedFormats || FILE_UPLOAD.SUPPORTED_FORMATS
	)

	// Set client-side rendering flag
	useEffect(() => {
		setIsClient(true)
	}, [])

	// Filter accepted formats based on initialSourceFormat
	useEffect(() => {
		if (initialSourceFormat) {
			// Find the format info from constants
			const formatKey = Object.keys(FILE_UPLOAD.SUPPORTED_FORMATS).find((key) => {
				// Safely access the SUPPORTED_FORMATS with the key as a known property
				const formats =
					FILE_UPLOAD.SUPPORTED_FORMATS[key as keyof typeof FILE_UPLOAD.SUPPORTED_FORMATS]
				return formats.some((type: string) => type.includes(initialSourceFormat.toLowerCase()))
			})

			if (formatKey) {
				const filteredTypes = {
					[formatKey]:
						FILE_UPLOAD.SUPPORTED_FORMATS[formatKey as keyof typeof FILE_UPLOAD.SUPPORTED_FORMATS]
				}
				setFilteredFormats(filteredTypes)
			} else {
				setFilteredFormats(propAcceptedFormats || FILE_UPLOAD.SUPPORTED_FORMATS)
			}
		} else {
			// Use the props or default if no initialSourceFormat is provided
			setFilteredFormats(propAcceptedFormats || FILE_UPLOAD.SUPPORTED_FORMATS)
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
				allowedTypes: Object.values(FILE_UPLOAD.MIME_TYPES).flat(),
				allowedExtensions: Object.values(FILE_UPLOAD.SUPPORTED_FORMATS).flat()
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
		[maxFileSize, onFileRejected, onFileAccepted]
	)

	// Always initialize the dropzone hook, but only use its functionality on the client side
	// This ensures hooks are always called in the same order
	const dropzoneConfig = useMemo(() => {
		return {
			accept: convertFormatsToAccept(filteredFormats),
			maxSize: maxFileSize,
			multiple: false,
			onDropAccepted: (files: File[]) => {
				if (files.length > 0) {
					const selectedFile = files[0]
					setFile(selectedFile)

					const result = validateFile(selectedFile, {
						maxSize: maxFileSize,
						allowedTypes: Object.values(FILE_UPLOAD.MIME_TYPES).flat(),
						allowedExtensions: Object.values(FILE_UPLOAD.SUPPORTED_FORMATS).flat()
					})
					setValidationResult(result)

					if (result.isValid && onFileAccepted) {
						onFileAccepted(selectedFile)
					}
				}
			},
			onDropRejected: (fileRejections: FileRejection[], event: DropEvent) => {
				if (fileRejections.length > 0) {
					const rejection = fileRejections[0]
					const errorMessage = rejection.errors.map((e) => e.message).join(', ') || 'File rejected'
					setValidationResult({
						isValid: false,
						error: errorMessage,
						details: {
							sizeValid: !rejection.errors.some((e) => e.code === 'file-too-large'),
							typeValid: !rejection.errors.some((e) => e.code === 'file-invalid-type'),
							extensionValid: !rejection.errors.some((e) => e.code === 'file-invalid-type')
						}
					})

					if (onFileRejected) {
						onFileRejected(errorMessage)
					}
				}
			}
		}
	}, [filteredFormats, maxFileSize, onFileRejected, onFileAccepted])

	// Always call useDropzone, but with conditional config
	const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone(dropzoneConfig)

	// Get format-specific message
	const getFormatMessage = () => {
		if (initialSourceFormat) {
			return `Upload a ${initialSourceFormat.toUpperCase()} file`
		}
		return 'Drag & drop a file here, or click to select'
	}

	// If not client-side yet, render a simplified version to prevent hydration mismatch
	if (!isClient) {
		return (
			<div className={className}>
				<div className="cursor-pointer rounded-xl border-2 border-dashed border-gray-200 p-8 text-center">
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
							<p className="text-sm text-deepNavy/70">Loading file uploader...</p>
							<p className="text-xs text-deepNavy/60">
								Max file size: {(maxFileSize / 1024 / 1024).toFixed(0)} MB
							</p>
						</div>
					</div>
				</div>
			</div>
		)
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

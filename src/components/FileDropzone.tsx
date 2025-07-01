import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { formatFileSize } from '@/lib/utils'

interface FileDropzoneProps {
	onFileAccepted: (file: File) => void
	onFileRejected?: (error: string) => void
	maxSize?: number
	accept?: Record<string, string[]>
	className?: string
}

export function FileDropzone({
	onFileAccepted,
	onFileRejected,
	maxSize = 100 * 1024 * 1024, // 100MB default
	accept = {
		'application/pdf': ['.pdf'],
		'image/jpeg': ['.jpg', '.jpeg'],
		'image/png': ['.png'],
		'application/msword': ['.doc'],
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
	},
	className = ''
}: FileDropzoneProps) {
	const [isDragActive, setIsDragActive] = useState(false)

	const onDrop = useCallback(
		(acceptedFiles: File[], rejectedFiles: any[]) => {
			if (acceptedFiles.length > 0) {
				onFileAccepted(acceptedFiles[0])
			}

			if (rejectedFiles.length > 0) {
				const error = rejectedFiles[0].errors[0]
				if (error.code === 'file-too-large') {
					onFileRejected?.(`File is too large. Max size is ${formatFileSize(maxSize)}.`)
				} else if (error.code === 'file-invalid-type') {
					onFileRejected?.('File type not supported.')
				} else {
					onFileRejected?.(error.message)
				}
			}
		},
		[onFileAccepted, onFileRejected, maxSize]
	)

	const { getRootProps, getInputProps, isDragReject, open } = useDropzone({
		onDrop,
		maxSize,
		accept,
		multiple: false,
		onDragEnter: () => setIsDragActive(true),
		onDragLeave: () => setIsDragActive(false),
		noClick: true // Prevent click from opening file dialog to fix error issue
	})

	return (
		<div
			{...getRootProps()}
			className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all duration-300 ${
				isDragActive ? 'border-trustTeal bg-trustTeal/10 shadow-md' : 'border-trustTeal/40 bg-white'
			} ${isDragReject ? 'border-warningRed bg-warningRed/5' : ''} ${className}`}
		>
			<input {...getInputProps()} />

			{/* Simplified background - only visible when dragging */}
			<div
				className={`absolute inset-0 -z-10 rounded-xl bg-gradient-to-b from-trustTeal/5 to-transparent transition-opacity duration-300 ${
					isDragActive ? 'opacity-100' : 'opacity-0'
				}`}
			></div>

			{/* Upload icon */}
			<div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-trustTeal/20 to-trustTeal/30 p-5 shadow-inner">
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
					className="text-trustTeal"
				>
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
					<polyline points="17 8 12 3 7 8" />
					<line x1="12" y1="3" x2="12" y2="15" />
				</svg>
			</div>

			{/* Text */}
			<h3 className="mb-4 font-heading text-xl font-semibold text-deepNavy">
				Drag & drop your file here
			</h3>

			<div className="mb-5 flex flex-col items-center">
				<p className="mb-4 text-center text-base text-deepNavy/80">or</p>

				{/* Button - using onClick to prevent error */}
				<button
					type="button"
					onClick={open}
					className="relative flex items-center justify-center rounded-lg bg-trustTeal px-8 py-3 font-medium text-white shadow-md transition-all hover:bg-trustTeal/90 hover:shadow-lg focus:ring-2 focus:ring-trustTeal/50 focus:ring-offset-2"
				>
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
						className="mr-2"
					>
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
						<polyline points="14 2 14 8 20 8"></polyline>
						<line x1="12" y1="18" x2="12" y2="12"></line>
						<line x1="9" y1="15" x2="15" y2="15"></line>
					</svg>
					Browse Files
				</button>
			</div>

			{/* File size info */}
			<div className="flex items-center rounded-full bg-lightGray px-4 py-1.5 text-sm text-deepNavy/70">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="mr-1.5 text-trustTeal"
				>
					<circle cx="12" cy="12" r="10"></circle>
					<line x1="12" y1="16" x2="12" y2="12"></line>
					<line x1="12" y1="8" x2="12.01" y2="8"></line>
				</svg>
				Max file size: {formatFileSize(maxSize)}
			</div>

			{/* Error message */}
			{isDragReject && (
				<div className="mt-5 flex items-center rounded-lg bg-warningRed/10 px-5 py-3 text-base font-medium text-warningRed">
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
						className="mr-2"
					>
						<circle cx="12" cy="12" r="10"></circle>
						<line x1="12" y1="8" x2="12" y2="12"></line>
						<line x1="12" y1="16" x2="12.01" y2="16"></line>
					</svg>
					This file type is not supported.
				</div>
			)}
		</div>
	)
}

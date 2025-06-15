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

	const { getRootProps, getInputProps, isDragReject } = useDropzone({
		onDrop,
		maxSize,
		accept,
		multiple: false,
		onDragEnter: () => setIsDragActive(true),
		onDragLeave: () => setIsDragActive(false)
	})

	return (
		<div
			{...getRootProps()}
			className={`group relative flex flex-col items-center justify-center rounded-card border-2 border-dashed p-8 transition-all duration-300 ${
				isDragActive
					? 'scale-[1.02] border-trustTeal bg-trustTeal/5 shadow-lg'
					: 'border-border bg-background hover:border-trustTeal/50 hover:bg-background/80 hover:shadow-md'
			} ${isDragReject ? 'border-warningRed bg-warningRed/5' : ''} ${className}`}
		>
			<input {...getInputProps()} />

			{/* Decorative rings */}
			<div className="absolute inset-0 -z-10 rounded-card border border-trustTeal/10 opacity-0 transition-opacity group-hover:opacity-100"></div>
			<div className="absolute inset-[-8px] -z-10 rounded-card border border-trustTeal/5 opacity-0 transition-opacity group-hover:opacity-100"></div>

			<div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-trustTeal/10 transition-transform group-hover:scale-110">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="28"
					height="28"
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

			<h3 className="mb-3 text-xl font-medium">Drag & drop your file here</h3>
			<p className="mb-4 text-center text-sm text-muted-foreground">
				or{' '}
				<span className="cursor-pointer font-medium text-trustTeal underline-offset-4 transition-colors hover:text-trustTeal/80 hover:underline">
					browse files
				</span>
			</p>
			<p className="text-xs text-muted-foreground">Max file size: {formatFileSize(maxSize)}</p>

			{isDragReject && (
				<div className="mt-4 text-sm font-medium text-warningRed">
					This file type is not supported.
				</div>
			)}
		</div>
	)
}

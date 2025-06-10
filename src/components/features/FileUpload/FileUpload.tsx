import { useState, useCallback, useMemo, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { FileIcon, UploadIcon, CheckIcon, XIcon, Loader2Icon } from 'lucide-react'

import { useFileConversion } from '@/lib/hooks/useFileConversion'
import { useSupportedFormats } from '@/lib/hooks/useSupportedFormats'
import { QueryProvider } from '@/lib/providers/QueryProvider'
import { Button } from '@/components/ui/button'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Download, FileUp, Loader2, RefreshCw, Upload, X } from 'lucide-react'
import type { ConversionFormat } from '@/lib/types'

// Constants
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const ACCEPTED_FILE_TYPES = {
	'application/pdf': ['.pdf'],
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
	'image/*': ['.png', '.jpg', '.jpeg', '.gif']
}

// Types
interface FormatOption {
	id: string
	name: string
}

interface FileUploadContentProps {
	onError?: (error: Error) => void
}

// Debug logging
const debug = {
	log: (message: string, data?: any) => {
		if (process.env.NODE_ENV === 'development') {
			console.log(`[FileUpload] ${message}`, data || '')
		}
	},
	error: (message: string, error?: any) => {
		if (process.env.NODE_ENV === 'development') {
			console.error(`[FileUpload] ${message}`, error || '')
		}
	}
}

/**
 * Constants for file upload configuration
 */
const UPLOAD_CONFIG = {
	acceptedFileTypes: {
		'application/pdf': ['.pdf'],
		'application/msword': ['.doc'],
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
		'application/vnd.oasis.opendocument.text': ['.odt'],
		'application/rtf': ['.rtf'],
		'text/plain': ['.txt'],
		'application/vnd.ms-excel': ['.xls'],
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
		'application/vnd.oasis.opendocument.spreadsheet': ['.ods'],
		'text/csv': ['.csv'],
		'application/vnd.ms-powerpoint': ['.ppt'],
		'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
		'application/vnd.oasis.opendocument.presentation': ['.odp'],
		'image/jpeg': ['.jpg', '.jpeg'],
		'image/png': ['.png'],
		'image/bmp': ['.bmp'],
		'image/tiff': ['.tiff', '.tif'],
		'image/gif': ['.gif'],
		'image/webp': ['.webp']
	},
	maxFileSize: 100 * 1024 * 1024 // 100MB
} as const

/**
 * FileUploadContent component
 * Handles file upload, format selection, and conversion process
 */
export function FileUploadContent({ onError }: FileUploadContentProps) {
	const {
		file,
		setFile,
		format,
		setFormat,
		startConversion,
		status,
		progress,
		downloadUrl,
		error,
		isPosting,
		isStatusLoading,
		reset,
		formats,
		isLoadingFormats
	} = useFileConversion()
	const [formatError, setFormatError] = useState<string | null>(null)
	const [selectedFormat, setSelectedFormat] = useState<string | null>(null)

	// Debug logging for formats data changes
	useEffect(() => {
		debug.log('Formats data changed', {
			hasData: Boolean(formats),
			dataLength: formats?.length
		})
	}, [formats])

	/**
	 * Extract file extension from file name
	 * @returns File extension in lowercase, or null if no extension found
	 */
	const fileExtension = useMemo(() => {
		if (!file) return null
		const ext = file.name.split('.').pop()?.toLowerCase()
		debug.log('File extension extracted', { file: file.name, extension: ext })
		return ext || null
	}, [file?.name])

	/**
	 * Calculate available output formats based on input file type
	 * @returns Array of available output formats, or empty array if none available
	 */
	const availableFormats = useMemo(() => {
		if (!fileExtension || !formats.length) {
			debug.log('No formats available', {
				fileExtension,
				formatsCount: formats.length
			})
			return []
		}

		// Find formats that support this file extension as input
		const supportedFormats = formats.filter((fmt: ConversionFormat) => {
			const isSupported = fmt.inputFormats.some((input: string) => {
				// Backend returns formats without dots (e.g., "docx" not ".docx")
				const normalizedInput = input.toLowerCase()
				const normalizedExt = fileExtension.toLowerCase()
				const matches = normalizedInput === normalizedExt
				debug.log('Checking format support', {
					format: fmt.id,
					inputFormat: input,
					normalizedInput,
					fileExtension,
					normalizedExt,
					matches
				})
				return matches
			})
			return isSupported
		})

		if (supportedFormats.length === 0) {
			debug.log('No supported formats found', { fileExtension })
			setFormatError(`File type .${fileExtension} is not supported`)
			return []
		}

		// Get all possible output formats for this file type
		const outputFormats = supportedFormats.flatMap((fmt: ConversionFormat) =>
			fmt.outputFormats.map((output: string) => ({
				id: output.toLowerCase(),
				name: output.toUpperCase()
			}))
		)

		// Remove duplicates and sort alphabetically
		const uniqueFormats = Array.from(new Map(outputFormats.map((f) => [f.id, f])).values()).sort(
			(a, b) => a.name.localeCompare(b.name)
		)

		debug.log('Available formats calculated', {
			fileExtension,
			supportedCount: supportedFormats.length,
			outputCount: uniqueFormats.length,
			formats: uniqueFormats
		})

		return uniqueFormats
	}, [fileExtension, formats])

	/**
	 * Handle file drop event
	 * @param acceptedFiles Array of accepted files
	 */
	const onDrop = useCallback(
		(acceptedFiles: File[]) => {
			const droppedFile = acceptedFiles[0]
			if (!droppedFile) return

			// Validate file size
			if (droppedFile.size > UPLOAD_CONFIG.maxFileSize) {
				debug.error('File too large', {
					size: droppedFile.size,
					maxSize: UPLOAD_CONFIG.maxFileSize
				})
				return
			}

			setFile(droppedFile)
			setFormatError(null)
			setSelectedFormat(null)
		},
		[setFile]
	)

	// Configure dropzone
	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: UPLOAD_CONFIG.acceptedFileTypes,
		maxFiles: 1,
		multiple: false
	})

	/**
	 * Handle format selection
	 * @param format Selected output format
	 */
	const handleFormatSelect = useCallback(
		(format: string) => {
			setSelectedFormat(format)
			setFormat(format)
			setFormatError(null)
		},
		[setSelectedFormat, setFormat]
	)

	/**
	 * Handle conversion start
	 */
	const handleConvert = useCallback(async () => {
		if (!file || !selectedFormat) return
		startConversion()
	}, [file, selectedFormat, startConversion])

	// Render different states based on conversion status
	if (status === 'completed') {
		return (
			<div className="text-center">
				<h3 className="mb-4 text-lg font-semibold">Conversion Complete!</h3>
				<a
					href={downloadUrl}
					download
					className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
				>
					<Download className="mr-2 h-4 w-4" />
					Download Converted File
				</a>
			</div>
		)
	}

	if (status === 'failed') {
		return (
			<div className="text-center">
				<h3 className="mb-4 text-lg font-semibold text-red-600">Conversion Failed</h3>
				<p className="mb-4 text-gray-600">{error?.message}</p>
				<button
					onClick={reset}
					className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
				>
					<RefreshCw className="mr-2 h-4 w-4" />
					Try Again
				</button>
			</div>
		)
	}

	if (status === 'processing' || isPosting || isStatusLoading) {
		return (
			<div className="text-center">
				<h3 className="mb-4 text-lg font-semibold">Converting...</h3>
				<Progress value={progress || 0} className="w-full" />
			</div>
		)
	}

	return (
		<div className="space-y-6">
			<div
				{...getRootProps()}
				className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
					isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
				}`}
			>
				<input {...getInputProps()} />
				<Upload className="mx-auto mb-4 h-12 w-12 text-gray-400" />
				<p className="text-gray-600">
					{isDragActive ? 'Drop the file here' : 'Drag and drop a file here, or click to select'}
				</p>
				<p className="mt-2 text-sm text-gray-500">
					Max file size: {UPLOAD_CONFIG.maxFileSize / (1024 * 1024)}MB
				</p>
			</div>

			{file && (
				<div className="space-y-4">
					<div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
						<div className="flex items-center space-x-3">
							<FileIcon className="h-6 w-6 text-gray-500" />
							<div>
								<p className="font-medium">{file.name}</p>
								<p className="text-sm text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
							</div>
						</div>
						<button
							onClick={() => {
								setFile(null)
								setSelectedFormat(null)
								setFormatError(null)
							}}
							className="text-gray-500 hover:text-gray-700"
						>
							<XIcon className="h-5 w-5" />
						</button>
					</div>

					{formatError ? (
						<div className="text-sm text-red-600">{formatError}</div>
					) : (
						<div className="space-y-2">
							<Label>Select output format:</Label>
							<Select
								value={selectedFormat || ''}
								onValueChange={handleFormatSelect}
								disabled={isLoadingFormats || !availableFormats.length}
							>
								<SelectTrigger>
									<SelectValue placeholder="Choose format..." />
								</SelectTrigger>
								<SelectContent>
									{availableFormats.map((format) => (
										<SelectItem key={format.id} value={format.id}>
											{format.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					<Button
						onClick={handleConvert}
						disabled={
							!selectedFormat ||
							isPosting ||
							status === 'processing' ||
							status === 'completed' ||
							isStatusLoading
						}
						className="w-full"
					>
						{isPosting || isStatusLoading ? (
							<>
								<Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
								Converting...
							</>
						) : (
							<>
								<FileUp className="mr-2 h-4 w-4" />
								Convert File
							</>
						)}
					</Button>
				</div>
			)}
		</div>
	)
}
/**
 * FileUpload component wrapper with QueryProvider
 */
export function FileUpload(props: FileUploadContentProps) {
	return (
		<QueryProvider>
			<FileUploadContent {...props} />
		</QueryProvider>
	)
}

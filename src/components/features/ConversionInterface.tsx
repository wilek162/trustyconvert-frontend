import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { UseQueryOptions } from '@tanstack/react-query'
import { convertFile, getJobStatus } from '@/lib/api/apiClient'
import { updateJobStatus, getJob } from '@/lib/stores/upload'
import type { FileUploadData, JobStatus } from '@/lib/stores/upload'
import type { ApiResponse, JobStatusResponse, ConvertResponse } from '@/lib/types/api'

// Available conversion formats
const CONVERSION_FORMATS = [
	{ value: 'pdf', label: 'PDF Document (.pdf)', icon: '📄' },
	{ value: 'docx', label: 'Word Document (.docx)', icon: '📝' },
	{ value: 'xlsx', label: 'Excel Spreadsheet (.xlsx)', icon: '📊' },
	{ value: 'pptx', label: 'PowerPoint (.pptx)', icon: '📊' },
	{ value: 'jpg', label: 'JPEG Image (.jpg)', icon: '🖼️' },
	{ value: 'png', label: 'PNG Image (.png)', icon: '🖼️' },
	{ value: 'svg', label: 'SVG Image (.svg)', icon: '🖼️' },
	{ value: 'txt', label: 'Text File (.txt)', icon: '📝' },
	{ value: 'html', label: 'HTML Document (.html)', icon: '🌐' },
	{ value: 'md', label: 'Markdown (.md)', icon: '📝' },
	{ value: 'json', label: 'JSON File (.json)', icon: '📋' },
	{ value: 'csv', label: 'CSV File (.csv)', icon: '📊' }
]

// Get recommended formats based on input file type
function getRecommendedFormats(mimeType: string): string[] {
	const formatMap: Record<string, string[]> = {
		'application/pdf': ['docx', 'jpg', 'png', 'txt'],
		'image/jpeg': ['png', 'pdf', 'svg'],
		'image/png': ['jpg', 'pdf', 'svg'],
		'image/svg+xml': ['png', 'jpg', 'pdf'],
		'application/msword': ['pdf', 'txt', 'docx'],
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['pdf', 'txt'],
		'application/vnd.ms-excel': ['pdf', 'csv', 'xlsx'],
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['pdf', 'csv'],
		'application/vnd.ms-powerpoint': ['pdf', 'pptx'],
		'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pdf'],
		'text/plain': ['pdf', 'docx', 'html'],
		'text/html': ['pdf', 'txt'],
		'text/csv': ['xlsx', 'pdf']
	}

	return formatMap[mimeType] || ['pdf', 'docx', 'jpg']
}

// Component props
interface ConversionInterfaceProps {
	jobId: string
	onConversionComplete?: (jobId: string) => void
	onConversionFailed?: (error: string) => void
}

export default function ConversionInterface({
	jobId,
	onConversionComplete,
	onConversionFailed
}: ConversionInterfaceProps) {
	// State
	const [isConverting, setIsConverting] = useState(false)
	const [targetFormat, setTargetFormat] = useState<string>('')
	const [error, setError] = useState<string | null>(null)
	const [fileData, setFileData] = useState<FileUploadData | null>(null)
	const [recommendedFormats, setRecommendedFormats] = useState<string[]>(['pdf'])

	// Load file data from store
	useEffect(() => {
		const loadFileData = async () => {
			if (jobId) {
				const job = await getJob(jobId)
				if (job) {
					setFileData(job)
					// Auto-select target format if available
					if (job.targetFormat && !targetFormat) {
						setTargetFormat(job.targetFormat)
					}

					// Set recommended formats based on file type
					const recommended = getRecommendedFormats(job.mimeType)
					setRecommendedFormats(recommended)

					// Set initial format to first recommended format
					if (recommended.length > 0) {
						setTargetFormat(recommended[0])
					}
				}
			}
		}

		loadFileData()
	}, [jobId, targetFormat])

	// Poll for job status
	const { data: jobStatusResponse, refetch } = useQuery({
		queryKey: ['jobStatus', jobId],
		queryFn: async () => getJobStatus(jobId),
		enabled: isConverting,
		refetchInterval: (query) => {
			const data = query.state.data
			if (!data || data.data.status === 'completed' || data.data.status === 'failed') {
				return false
			}
			return 3000 // Poll every 3 seconds
		}
	})

	// Handle successful status update
	useEffect(() => {
		const handleStatusUpdate = async () => {
			if (!jobStatusResponse?.success || !isConverting) return

			const status = jobStatusResponse.data.status

			// Update job status in store
			await updateJobStatus(jobId, status as JobStatus, {
				completedAt: jobStatusResponse.data.completed_at,
				errorMessage: jobStatusResponse.data.error_message
			})

			if (status === 'completed') {
				setIsConverting(false)

				// Notify parent
				if (onConversionComplete) {
					onConversionComplete(jobId)
				}
			} else if (status === 'failed') {
				setIsConverting(false)
				setError(jobStatusResponse.data.error_message || 'Conversion failed')

				// Notify parent
				if (onConversionFailed) {
					onConversionFailed(jobStatusResponse.data.error_message || 'Conversion failed')
				}
			}
		}

		handleStatusUpdate()
	}, [jobStatusResponse, isConverting, jobId, onConversionComplete, onConversionFailed])

	// Start conversion
	const handleConvert = async () => {
		if (!jobId || !targetFormat) return

		try {
			setIsConverting(true)
			setError(null)

			// Update job status
			await updateJobStatus(jobId, 'processing', { targetFormat })

			// Call convert API
			const response = await convertFile(jobId, targetFormat)

			if (!response.success) {
				throw new Error('Conversion failed to start')
			}

			// Start polling for status
			refetch()
		} catch (error) {
			console.error('Conversion error:', error)
			setIsConverting(false)
			const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
			setError(`Failed to convert file: ${errorMessage}`)

			// Update job status
			await updateJobStatus(jobId, 'failed', {
				errorMessage: errorMessage
			})

			// Notify parent
			if (onConversionFailed) {
				onConversionFailed(errorMessage)
			}
		}
	}

	// Format change handler
	const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setTargetFormat(e.target.value)
	}

	// Retry conversion
	const handleRetry = () => {
		setError(null)
		handleConvert()
	}

	if (!fileData) {
		return <div className="text-center text-gray-500">Loading file data...</div>
	}

	return (
		<div className="mt-4">
			<h2 className="mb-2 text-lg font-semibold">Convert File</h2>

			{/* File info */}
			<div className="mb-4 rounded-md bg-gray-50 p-3">
				<p className="text-sm text-gray-700">
					<span className="font-medium">File:</span> {fileData.originalFilename}
				</p>
				<p className="text-sm text-gray-700">
					<span className="font-medium">Size:</span> {Math.round(fileData.fileSize / 1024)} KB
				</p>
				<p className="text-sm text-gray-700">
					<span className="font-medium">Type:</span> {fileData.mimeType}
				</p>
			</div>

			{/* Format selection */}
			{!isConverting && !error && (
				<div className="mb-4">
					<label htmlFor="format" className="mb-2 block text-sm font-medium text-gray-700">
						Select output format
					</label>
					<select
						id="format"
						className="block w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none"
						value={targetFormat}
						onChange={handleFormatChange}
						disabled={isConverting}
					>
						<option value="">Select format</option>
						<option value="pdf">PDF</option>
						<option value="docx">DOCX</option>
						<option value="jpg">JPG</option>
						<option value="png">PNG</option>
					</select>

					<button
						className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none disabled:bg-gray-400"
						onClick={handleConvert}
						disabled={!targetFormat || isConverting}
					>
						Convert Now
					</button>
				</div>
			)}

			{/* Conversion status */}
			{isConverting && (
				<div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-4">
					<div className="flex items-center">
						<div className="mr-3">
							<svg
								className="h-5 w-5 animate-spin text-blue-600"
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
						<div>
							<p className="font-medium text-blue-800">Converting your file</p>
							<p className="text-sm text-blue-600">
								{jobStatusResponse?.data.status === 'processing'
									? 'Processing...'
									: 'Initializing conversion...'}
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Error message */}
			{error && (
				<div className="mb-4 rounded-lg border border-red-100 bg-red-50 p-4">
					<div className="flex">
						<div className="mr-3 text-red-500">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
						<div>
							<p className="font-medium text-red-800">Conversion failed</p>
							<p className="text-sm text-red-600">{error}</p>
							<button
								className="mt-2 text-sm font-medium text-red-600 hover:text-red-800"
								onClick={handleRetry}
							>
								Try again
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

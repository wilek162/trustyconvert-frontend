import React, { useState, useEffect } from 'react'
import { uploadStore } from '@/lib/stores/upload'
import { debugLog, debugError } from '@/lib/utils/debug'
import { Loader2, DownloadCloud, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { downloadService } from '@/lib/services/downloadService'
import { errorHandlingService } from '@/lib/errors/errorHandlingService'
import { toastService } from '@/lib/services/toastService'
import { MESSAGE_TEMPLATES } from '@/lib/constants/messages'
import { retryService, RETRY_STRATEGIES } from '@/lib/utils/RetryService'
import { DownloadError } from '@/lib/errors/error-types'

interface DownloadManagerProps {
	jobId: string
	initialToken?: string
	onDownloadComplete?: () => void
}

function DownloadManager({ jobId, initialToken, onDownloadComplete }: DownloadManagerProps) {
	const [error, setError] = useState<string | null>(null)
	const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [downloadStarted, setDownloadStarted] = useState(false)
	const [downloadToken, setDownloadToken] = useState<string | null>(initialToken || null)
	const [isDownloading, setIsDownloading] = useState(false)
	const [downloadComplete, setDownloadComplete] = useState(false)
	const [retryCount, setRetryCount] = useState(0)

	// On mount, check if we have a token or need to fetch one
	useEffect(() => {
		const checkOrFetchToken = async () => {
			setError(null)

			// If we have an initial token from props, use it
			if (initialToken) {
				debugLog('Using initial token from props:', initialToken)
				setDownloadToken(initialToken)
				const result = await downloadService.getDownloadToken(jobId)
				if (result.success && result.url) {
					setDownloadUrl(result.url)
				}
				return
			}

			// Otherwise fetch a new token
			fetchDownloadToken()
		}

		checkOrFetchToken()
	}, [jobId, initialToken, retryCount])

	// Fetch download token
	const fetchDownloadToken = async () => {
		if (isLoading) return

		setIsLoading(true)
		setError(null)

		try {
			// Use retry service for better reliability
			const result = await retryService.withRetry(
				() => downloadService.getDownloadToken(jobId),
				{
					...RETRY_STRATEGIES.DOWNLOAD,
					context: {
						action: 'fetchDownloadToken',
						jobId
					}
				}
			)

			if (!result.success) {
				throw new DownloadError(result.error || 'Failed to get download token', { jobId })
			}

			setDownloadToken(result.token || null)
			setDownloadUrl(result.url || null)
		} catch (error) {
			const result = await errorHandlingService.handleError(error, {
				context: {
					action: 'fetchDownloadToken',
					jobId,
					retryCount
				},
				showToast: false
			})
			
			setError(result.message)
		} finally {
			setIsLoading(false)
		}
	}

	// Handle download click - delegate to download service
	const handleDownload = async () => {
		if (!jobId) return
		setError(null)
		setIsDownloading(true)

		try {
			const result = await downloadService.downloadFile(jobId, {
				onComplete: () => {
					setDownloadComplete(true)
					setDownloadStarted(true)
					if (onDownloadComplete) onDownloadComplete()
				},
				onError: (error) => {
					setError(error.message)
				},
				retryConfig: {
					...RETRY_STRATEGIES.DOWNLOAD,
					context: {
						action: 'downloadFile',
						jobId,
						retryCount
					}
				}
			})

			if (!result.success) {
				throw new DownloadError(result.error || 'Failed to initiate download', { jobId })
			}

			// Update state with new token/url if they changed
			if (result.token) setDownloadToken(result.token)
			if (result.url) setDownloadUrl(result.url)
		} catch (error) {
			const result = await errorHandlingService.handleError(error, {
				context: {
					action: 'handleDownload',
					jobId,
					retryCount
				},
				showToast: false
			})
			
			setError(result.message)
			debugError('Download failed:', error)
		} finally {
			setIsDownloading(false)
		}
	}

	// Retry getting download token
	const handleRetry = () => {
		setError(null)
		setRetryCount((count) => count + 1)
		fetchDownloadToken()
	}

	return (
		<div className="relative mt-6 flex flex-col space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
			{/* Status indicator */}
			<div className="mb-4 flex items-center justify-between">
				<h3 className="text-lg font-semibold">Your file is ready</h3>

				{!error && !isLoading && !isDownloading && downloadUrl && (
					<span className="flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
						<CheckCircle className="mr-1 h-4 w-4" />
						<p className="text-sm text-gray-500">Ready to download</p>
					</span>
				)}
			</div>

			{/* Loading states */}
			{isLoading && (
				<div className="flex flex-col items-center justify-center space-y-4 py-6">
					<div className="animate-spin">
						<Loader2 className="h-10 w-10 text-blue-600" />
					</div>
					<p className="font-medium text-gray-700">Preparing your download</p>
					<p className="max-w-md text-center text-sm text-gray-500">
						This may take a few moments depending on the file size
					</p>
				</div>
			)}
			
			{/* Downloading state */}
			{isDownloading && (
				<div className="flex flex-col items-center justify-center space-y-4 py-6">
					<div className="animate-spin">
						<Loader2 className="h-10 w-10 text-blue-600" />
					</div>
					<p className="font-medium text-gray-700">Starting download...</p>
					<p className="max-w-md text-center text-sm text-gray-500">
						Your download should begin automatically
					</p>
				</div>
			)}

			{/* Error state */}
			{error && (
				<div className="mb-4 border-l-4 border-red-500 bg-red-50 p-4">
					<div className="flex items-start">
						<div className="flex-shrink-0">
							<AlertCircle className="h-5 w-5 text-red-500" />
						</div>
						<div className="ml-3">
							<h3 className="text-sm font-medium text-red-800">Download error</h3>
							<div className="mt-2 text-sm text-red-700">{error}</div>
							<div className="mt-4">
								<button
									type="button"
									onClick={handleRetry}
									className="inline-flex items-center rounded-md border border-transparent bg-red-600 px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
								>
									<RefreshCw className="mr-2 h-4 w-4" />
									Retry download
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Download button */}
			{downloadUrl && !isLoading && !isDownloading && !error && !downloadComplete && (
				<div className="flex justify-center">
					<button
						onClick={handleDownload}
						className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-5 py-3 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					>
						<DownloadCloud className="mr-2 h-5 w-5" />
						Download File
					</button>
				</div>
			)}

			{/* Success state */}
			{downloadComplete && !error && (
				<div className="mt-4 text-center">
					<div className="mb-2 flex items-center justify-center text-green-600">
						<CheckCircle className="mr-2 h-6 w-6" />
						<p className="font-medium">Download started!</p>
					</div>
					<p className="text-sm text-gray-600">
						If your download didn't start automatically,{' '}
						<button onClick={handleDownload} className="text-blue-600 hover:underline">
							click here
						</button>
					</p>
				</div>
			)}
		</div>
	)
}

export { DownloadManager }


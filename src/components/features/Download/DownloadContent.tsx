import { useEffect } from 'react'
import { toast } from 'sonner'
import { Download, RefreshCw, AlertCircle, Loader2, Clock, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { useConversionStatus } from '@/lib/hooks/useConversionStatus'
import { useFileDownload } from '@/lib/hooks/useFileDownload'
import { formatFileSize, formatDuration } from '@/lib/utils/format'

interface DownloadContentProps {
	taskId: string
	onError?: (error: string) => void
	onComplete?: () => void
}

export function DownloadContent({ taskId, onError, onComplete }: DownloadContentProps) {
	// Use conversion status hook
	const {
		status,
		progress,
		error: statusError,
		downloadUrl,
		fileName,
		fileSize,
		isLoading: isLoadingStatus,
		cancel: cancelConversion
	} = useConversionStatus({
		taskId,
		onComplete: () => {
			toast.success('Conversion completed!')
			if (onComplete) onComplete()
		},
		onError: (error) => {
			toast.error('Conversion failed: ' + error)
			if (onError) onError(error)
		},
		onProgress: (progress) => {
			toast.loading(`Converting... ${progress}%`, { id: 'conversion-progress' })
		}
	})

	// Use file download hook
	const {
		isDownloading,
		progress: downloadProgress,
		error: downloadError,
		download,
		cancel: cancelDownload
	} = useFileDownload({
		onComplete: () => {
			toast.success('Download completed!')
			if (onComplete) onComplete()
		},
		onError: (error) => {
			toast.error('Download failed: ' + error)
			if (onError) onError(error)
		}
	})

	// Handle download
	const handleDownload = () => {
		if (!fileName) {
			toast.error('File name not available')
			return
		}
		download(taskId, fileName)
	}

	// Handle retry
	const handleRetry = () => {
		window.location.href = '/'
	}

	// Handle cancel
	const handleCancel = () => {
		if (status === 'processing') {
			cancelConversion()
		} else if (isDownloading) {
			cancelDownload()
		}
		window.location.href = '/'
	}

	// Show error state
	if (statusError || downloadError) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-destructive">
						<AlertCircle className="h-5 w-5" />
						Error
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Alert variant="destructive">
						<AlertDescription>
							{statusError || downloadError || 'An error occurred'}
						</AlertDescription>
					</Alert>
				</CardContent>
				<CardFooter className="flex gap-2">
					<Button onClick={handleRetry} className="flex-1">
						<RefreshCw className="mr-2 h-4 w-4" />
						Try Again
					</Button>
					<Button onClick={handleCancel} variant="outline">
						<X className="mr-2 h-4 w-4" />
						Cancel
					</Button>
				</CardFooter>
			</Card>
		)
	}

	// Show loading state
	if (isLoadingStatus) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center justify-center py-8">
					<Loader2 className="h-8 w-8 animate-spin text-primary" />
					<p className="mt-4 text-lg font-medium">Checking conversion status...</p>
				</CardContent>
			</Card>
		)
	}

	// Show conversion status
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-center text-2xl">
					{status === 'completed' ? 'Conversion Complete!' : 'Converting...'}
				</CardTitle>
				{status === 'processing' && (
					<CardDescription className="text-center">
						Please wait while we convert your file
					</CardDescription>
				)}
			</CardHeader>
			<CardContent className="space-y-6">
				{status === 'processing' && (
					<div className="space-y-2">
						<div className="flex justify-between text-sm">
							<span>Progress</span>
							<span>{progress}%</span>
						</div>
						<Progress value={progress} />
					</div>
				)}

				{status === 'completed' && (
					<div className="space-y-4">
						<div className="flex items-center justify-between rounded-lg border p-4">
							<div className="flex items-center gap-3">
								<FileText className="h-5 w-5 text-muted-foreground" />
								<div>
									<p className="font-medium">{fileName}</p>
									{fileSize && (
										<p className="text-sm text-muted-foreground">{formatFileSize(fileSize)}</p>
									)}
								</div>
							</div>
							<Button onClick={handleDownload} disabled={isDownloading} className="gap-2">
								{isDownloading ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<Download className="h-4 w-4" />
								)}
								{isDownloading ? 'Downloading...' : 'Download'}
							</Button>
						</div>

						{downloadProgress && (
							<div className="space-y-2">
								<div className="flex justify-between text-sm">
									<span>Download Progress</span>
									<span>
										{formatFileSize(downloadProgress.loaded)} /{' '}
										{formatFileSize(downloadProgress.total)}
									</span>
								</div>
								<Progress value={(downloadProgress.loaded / downloadProgress.total) * 100} />
								<div className="flex items-center justify-between text-sm text-muted-foreground">
									<span className="flex items-center gap-1">
										<Clock className="h-4 w-4" />
										{formatDuration(downloadProgress.estimatedTime)} remaining
									</span>
									<span>{formatFileSize(downloadProgress.speed)}/s</span>
								</div>
							</div>
						)}
					</div>
				)}
			</CardContent>
		</Card>
	)
}

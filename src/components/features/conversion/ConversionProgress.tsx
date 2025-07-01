import React from 'react'
import { Progress } from '@/components/ui/progress'

interface ConversionProgressProps {
	step: 'upload' | 'convert'
	progress: number
	fileName?: string
	targetFormat?: string
}

export function ConversionProgress({
	step,
	progress,
	fileName,
	targetFormat
}: ConversionProgressProps) {
	return (
		<div className="space-y-6 py-4">
			<div className="text-center">
				<h3 className="mb-2 text-lg font-medium text-deepNavy">
					{step === 'upload' ? 'Uploading File' : 'Converting File'}
				</h3>
				<p className="text-sm text-deepNavy/70">
					{step === 'upload' ? fileName : `${fileName} to ${targetFormat?.toUpperCase()}`}
				</p>
			</div>

			<Progress value={progress} className="h-2 w-full" />

			<div className="flex items-center justify-between">
				<p className="text-sm text-deepNavy/70">
					{step === 'upload' ? 'Uploading securely...' : 'Converting format...'}
				</p>
				<p className="text-sm font-medium text-deepNavy">{Math.round(progress)}%</p>
			</div>

			{step === 'convert' && progress > 0 && progress < 100 && (
				<div className="rounded-lg bg-trustTeal/5 p-3 text-xs text-deepNavy/70">
					<p>
						Your file is being processed securely. This may take a few moments depending on file
						size.
					</p>
				</div>
			)}
		</div>
	)
}

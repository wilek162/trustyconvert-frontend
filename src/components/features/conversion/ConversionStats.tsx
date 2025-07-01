import React from 'react'
import { formatFileSize } from '@/lib/utils/files'

interface ConversionStatsProps {
	originalFormat?: string
	targetFormat?: string
	fileName?: string
	fileSize?: number
	conversionTime?: number
}

export function ConversionStats({
	originalFormat,
	targetFormat,
	fileName,
	fileSize = 0,
	conversionTime
}: ConversionStatsProps) {
	return (
		<div className="rounded-xl border border-trustTeal/20 bg-gradient-to-r from-trustTeal/5 to-white p-5 shadow-sm">
			<h3 className="mb-3 text-base font-medium text-deepNavy">Conversion Details</h3>

			<div className="grid gap-4 md:grid-cols-2">
				<div className="space-y-3">
					<div>
						<p className="text-sm text-deepNavy/60">File Name</p>
						<p className="text-sm font-medium text-deepNavy" title={fileName}>
							{fileName
								? fileName.length > 25
									? fileName.substring(0, 22) + '...'
									: fileName
								: 'N/A'}
						</p>
					</div>

					<div>
						<p className="text-sm text-deepNavy/60">File Size</p>
						<p className="text-sm font-medium text-deepNavy">
							{fileSize ? formatFileSize(fileSize) : 'N/A'}
						</p>
					</div>
				</div>

				<div className="space-y-3">
					<div>
						<p className="text-sm text-deepNavy/60">Original Format</p>
						<div className="flex items-center">
							<div className="mr-2 flex h-6 w-6 items-center justify-center rounded bg-lightGray text-deepNavy">
								<span className="text-xs font-medium">{originalFormat?.toUpperCase() || '?'}</span>
							</div>
							<p className="text-sm font-medium text-deepNavy">
								{originalFormat ? `.${originalFormat.toLowerCase()}` : 'Unknown'}
							</p>
						</div>
					</div>

					<div>
						<p className="text-sm text-deepNavy/60">Converted Format</p>
						<div className="flex items-center">
							<div className="mr-2 flex h-6 w-6 items-center justify-center rounded bg-trustTeal/20 text-trustTeal">
								<span className="text-xs font-medium">{targetFormat?.toUpperCase() || '?'}</span>
							</div>
							<p className="text-sm font-medium text-deepNavy">
								{targetFormat ? `.${targetFormat.toLowerCase()}` : 'Unknown'}
							</p>
						</div>
					</div>
				</div>
			</div>

			<div className="mt-4 flex items-center justify-between rounded-lg bg-successGreen/10 p-3 text-successGreen">
				<div className="flex items-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="mr-2 h-4 w-4"
					>
						<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
						<polyline points="22 4 12 14.01 9 11.01" />
					</svg>
					<span className="text-sm font-medium">Conversion Successful</span>
				</div>

				{conversionTime && (
					<span className="text-xs">Completed in {(conversionTime / 1000).toFixed(1)}s</span>
				)}
			</div>
		</div>
	)
}

export default ConversionStats

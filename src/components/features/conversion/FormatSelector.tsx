import React from 'react'
import type { ConversionFormat } from '@/lib/api/types'

interface FormatSelectorProps {
	sourceFormat?: string
	selectedFormat: string
	availableFormats: string[]
	onFormatChange: (format: string) => void
	disabled?: boolean
}

function FormatSelector({
	sourceFormat,
	selectedFormat,
	availableFormats,
	onFormatChange,
	disabled = false
}: FormatSelectorProps) {
	return (
		<div className="space-y-4">
			<label className="text-sm font-medium text-deepNavy">
				{sourceFormat ? `Convert ${sourceFormat.toUpperCase()} to:` : 'Convert to:'}
			</label>
			<div className="flex flex-wrap gap-2">
				{availableFormats.map((format) => (
					<button
						key={format}
						type="button"
						onClick={() => onFormatChange(format)}
						disabled={disabled}
						className={`group relative rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
							selectedFormat === format
								? 'bg-trustTeal text-white shadow-md'
								: 'bg-lightGray text-deepNavy hover:bg-trustTeal/10 hover:shadow-sm'
						} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
						aria-pressed={selectedFormat === format}
					>
						<span className="flex items-center">
							{selectedFormat === format && (
								<svg
									className="mr-1 h-3 w-3"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clipRule="evenodd"
									/>
								</svg>
							)}
							.{format}
						</span>
						{selectedFormat === format && (
							<span className="absolute inset-0 z-0 rounded-full bg-trustTeal/10 blur-sm"></span>
						)}
					</button>
				))}
			</div>
		</div>
	)
}

export default FormatSelector
export { FormatSelector }

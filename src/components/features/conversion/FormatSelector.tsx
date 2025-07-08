import React, { useEffect, useState } from 'react'
import { FORMAT_CATEGORIES } from '@/lib/services/formatService'
import type { ConversionFormat } from '@/lib/types'

interface FormatSelectorProps {
	sourceFormat?: string
	selectedFormat: string
	availableFormats: string[]
	onFormatChange: (format: string) => void
	disabled?: boolean
}

export function FormatSelector({
	sourceFormat,
	selectedFormat,
	availableFormats,
	onFormatChange,
	disabled = false
}: FormatSelectorProps) {
	// Find which group the formats belong to
	const getFormatGroup = (format: string): string => {
		for (const [group, category] of Object.entries(FORMAT_CATEGORIES)) {
			if (category.formats.includes(format.toLowerCase())) {
				return group
			}
		}
		return 'other'
	}

	// Get format icon based on extension
	const getFormatIcon = (format: string): React.ReactNode => {
		const group = getFormatGroup(format)

		switch (group) {
			case 'document':
				return (
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
					>
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
						<polyline points="14 2 14 8 20 8" />
						<line x1="16" y1="13" x2="8" y2="13" />
						<line x1="16" y1="17" x2="8" y2="17" />
						<polyline points="10 9 9 9 8 9" />
					</svg>
				)
			case 'image':
				return (
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
					>
						<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
						<circle cx="8.5" cy="8.5" r="1.5" />
						<polyline points="21 15 16 10 5 21" />
					</svg>
				)
			case 'spreadsheet':
				return (
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
					>
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
						<polyline points="14 2 14 8 20 8" />
						<line x1="8" y1="13" x2="16" y2="13" />
						<line x1="8" y1="17" x2="16" y2="17" />
					</svg>
				)
			case 'presentation':
				return (
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
					>
						<path d="M3 3h18v18H3z" />
						<path d="m9 8 6 4-6 4Z" />
					</svg>
				)
			default:
				return (
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
					>
						<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
						<polyline points="13 2 13 9 20 9" />
					</svg>
				)
		}
	}

	return (
		<div className="space-y-5">
			<label className="text-lg font-medium text-deepNavy">
				{sourceFormat ? `Convert ${sourceFormat.toUpperCase()} to:` : 'Convert to:'}
			</label>
			<div className="flex flex-wrap gap-3">
				{availableFormats.map((format) => (
					<button
						key={format}
						type="button"
						onClick={() => onFormatChange(format)}
						disabled={disabled}
						className={`group relative rounded-lg px-5 py-3 text-base font-medium transition-all duration-200 ${
							selectedFormat === format
								? 'bg-trustTeal text-white shadow-md'
								: 'bg-lightGray text-deepNavy hover:bg-trustTeal/10 hover:shadow-sm'
						} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
						aria-pressed={selectedFormat === format}
					>
						<span className="flex items-center">
							{selectedFormat === format && (
								<svg
									className="mr-1.5 h-4 w-4"
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
							<span className="mr-1.5">{getFormatIcon(format)}</span>.{format}
						</span>
						{selectedFormat === format && (
							<span className="absolute inset-0 -z-10 rounded-lg bg-trustTeal/10 blur-sm"></span>
						)}
					</button>
				))}
			</div>
		</div>
	)
}

export default FormatSelector

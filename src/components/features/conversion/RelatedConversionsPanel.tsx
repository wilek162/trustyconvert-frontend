import React from 'react'
import type { ConversionFormat } from '@/lib/types/api'

interface RelatedConversionsPanelProps {
	relatedFormats: ConversionFormat[]
	targetFormat: string
	targetFormatName?: string
}

export function RelatedConversionsPanel({
	relatedFormats,
	targetFormat,
	targetFormatName
}: RelatedConversionsPanelProps) {
	// Use provided name or default to uppercase format ID
	const targetFormatDisplay = targetFormatName || targetFormat.toUpperCase()

	// Only render if we have related conversions
	if (!relatedFormats || relatedFormats.length === 0) {
		return null
	}

	return (
		<div className="group relative overflow-hidden rounded-lg border border-trustTeal/10 bg-white p-4 shadow-sm transition-all hover:shadow-md">
			<div className="absolute -right-12 -top-12 h-24 w-24 rounded-full bg-trustTeal/5 transition-transform duration-500 group-hover:scale-150"></div>

			<div className="relative z-10">
				<h3 className="mb-3 text-sm font-medium text-deepNavy">
					Related Conversions
					<span className="mt-1 block h-0.5 w-16 bg-gradient-to-r from-trustTeal to-trustTeal/30"></span>
				</h3>

				<div className="space-y-1.5">
					{relatedFormats.map((format) => (
						<a
							key={format.id}
							href={`/convert/${format.id}-to-${targetFormat}`}
							className="flex items-center rounded-md px-2 py-1.5 text-xs transition-all hover:bg-trustTeal/5"
						>
							<span className="mr-1.5 flex h-6 w-6 items-center justify-center rounded-md bg-trustTeal/10 text-xs text-trustTeal">
								{format.icon || '🔄'}
							</span>
							<span className="text-deepNavy/80 hover:text-trustTeal">
								{format.name} → {targetFormatDisplay}
							</span>
						</a>
					))}
				</div>
			</div>
		</div>
	)
}

export default RelatedConversionsPanel

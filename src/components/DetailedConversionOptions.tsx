import React, { useEffect, useState } from 'react'
import formatService, { FORMAT_CATEGORIES } from '@/lib/services/formatService'
import type { ConversionFormat } from '@/lib/types/api'

// Get category icon component
function getCategoryIcon(categoryId: string) {
	switch(categoryId) {
		case 'document':
			return (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="text-trustTeal"
				>
					<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
					<polyline points="14 2 14 8 20 8" />
				</svg>
			)
		case 'image':
			return (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="text-trustTeal"
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
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="text-trustTeal"
				>
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<polyline points="14 2 14 8 20 8" />
					<line x1="8" y1="13" x2="16" y2="13" />
					<line x1="8" y1="17" x2="16" y2="17" />
					<line x1="10" y1="9" x2="12" y2="9" />
				</svg>
			)
		case 'presentation':
			return (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="text-trustTeal"
				>
					<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
					<path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
				</svg>
			)
		default:
			return null
	}
}

export function DetailedConversionOptions() {
	const [formats, setFormats] = useState<ConversionFormat[]>([])
	const [conversionPairs, setConversionPairs] = useState<{[key: string]: string[]}>(
		Object.fromEntries(Object.keys(FORMAT_CATEGORIES).map(cat => [cat, []]))
	)
	
	// Load format data on component mount
	useEffect(() => {
		async function loadFormatData() {
			const allFormats = await formatService.getAllFormats()
			setFormats(allFormats)
			
			// Group conversion pairs by category
			const pairs: {[key: string]: string[]} = {}
			
			allFormats.forEach(format => {
				const category = formatService.getFormatCategory(format.id)
				
				if (!pairs[category]) {
					pairs[category] = []
				}
				
				format.outputFormats.forEach(targetFormat => {
					const pairString = `${format.id}-to-${targetFormat}`
					if (!pairs[category].includes(pairString)) {
						pairs[category].push(pairString)
					}
				})
			})
			
			setConversionPairs(pairs)
		}
		
		loadFormatData()
	}, [])
	
	// Get format name by ID
	function getFormatName(formatId: string): string {
		const format = formats.find(f => f.id === formatId)
		return format ? format.name : formatId.toUpperCase()
	}

	return (
		<section className="py-12">
			<div className="trusty-container">
				<div className="mb-12 text-center">
					<h2 className="relative mx-auto mb-6 inline-block font-heading text-3xl font-semibold text-deepNavy md:text-4xl">
						Detailed Conversion Options
						<span className="absolute -bottom-2 left-0 h-1 w-full bg-gradient-to-r from-trustTeal to-trustTeal/30"></span>
					</h2>
					<p className="mx-auto max-w-2xl text-lg text-deepNavy/80">
						Explore our complete list of file conversion options below
					</p>
				</div>

				<div className="grid gap-8 md:grid-cols-2">
					{Object.entries(FORMAT_CATEGORIES).map(([categoryId, category]) => (
						<div key={categoryId} className="rounded-xl border border-trustTeal/20 bg-white p-6 shadow-md">
							<div className="mb-4 flex items-center">
								<div className="mr-3 flex h-10 w-10 items-center justify-center rounded-lg bg-trustTeal/10">
									{getCategoryIcon(categoryId)}
								</div>
								<h3 className="text-xl font-semibold text-deepNavy">{category.name} Conversions</h3>
							</div>
							
							<div className="mt-4">
								{conversionPairs[categoryId]?.slice(0, 10).map((pair) => {
									const [source, target] = pair.split('-to-')
									return (
										<a
											key={pair}
											href={`/convert/${pair}`}
											className="mb-2 mr-2 inline-flex items-center rounded-md bg-lightGray px-3 py-1.5 text-sm font-medium text-deepNavy hover:bg-trustTeal/10"
										>
											{getFormatName(source)} → {getFormatName(target)}
										</a>
									)
								})}
								
								{(conversionPairs[categoryId]?.length > 10) && (
									<p className="mt-2 text-sm text-deepNavy/70">
										And {conversionPairs[categoryId].length - 10} more conversions...
									</p>
								)}
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}

export default DetailedConversionOptions

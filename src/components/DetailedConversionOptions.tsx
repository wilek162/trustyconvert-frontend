import React from 'react'
import { mockFormats } from '@/mocks/data'

// Group formats by category
const formatsByCategory = {
	document: mockFormats.filter((format) =>
		['pdf', 'docx', 'doc', 'txt', 'rtf', 'odt'].includes(format.id)
	),
	image: mockFormats.filter((format) =>
		['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(format.id)
	),
	spreadsheet: mockFormats.filter((format) => ['xlsx', 'xls', 'csv', 'ods'].includes(format.id)),
	presentation: mockFormats.filter((format) => ['pptx', 'ppt', 'odp'].includes(format.id))
}

const categoryNames = {
	document: 'Document Conversions',
	image: 'Image Conversions',
	spreadsheet: 'Spreadsheet Conversions',
	presentation: 'Presentation Conversions'
}

// Category icons matching the brand guidelines
const categoryIcons = {
	document: (
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
	),
	image: (
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
	),
	spreadsheet: (
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
	),
	presentation: (
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
}

export function DetailedConversionOptions() {
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
					{Object.entries(formatsByCategory).map(([category, formats]) => (
						<div
							id={category}
							key={category}
							className="trusty-card rounded-card border border-trustTeal/20 bg-white p-8 shadow-DEFAULT transition-all hover:shadow-lg"
						>
							<div className="mb-6 flex items-center">
								<div className="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-trustTeal/20 to-trustTeal/30 shadow-inner">
									{categoryIcons[category as keyof typeof categoryIcons]}
								</div>
								<h3 className="text-xl font-semibold text-deepNavy">
									{categoryNames[category as keyof typeof categoryNames]}
								</h3>
							</div>

							<div className="space-y-8">
								{formats.map((format) => (
									<div key={format.id} className="format-group">
										<h4 className="mb-4 flex items-center font-medium text-deepNavy">
											<span className="mr-2 text-trustTeal">{format.icon || '🔄'}</span>
											Convert {format.name} to:
										</h4>
										<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
											{format.outputFormats.map((outputFormat) => {
												// Find the target format info
												const targetFormat = mockFormats.find((f) => f.id === outputFormat)
												return (
													<a
														key={outputFormat}
														href={`/convert/${format.id}-to-${outputFormat}`}
														className="flex items-center rounded-md border border-lightGray bg-lightGray px-3 py-2 text-sm font-medium text-deepNavy transition-all hover:border-trustTeal/20 hover:bg-trustTeal/10 hover:text-deepNavy"
													>
														<span className="mr-2">{targetFormat?.icon || '🔄'}</span>
														<span>{targetFormat?.name || outputFormat.toUpperCase()}</span>
													</a>
												)
											})}
										</div>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}

export default DetailedConversionOptions

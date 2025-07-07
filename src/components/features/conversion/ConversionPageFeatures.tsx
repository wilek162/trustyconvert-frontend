import React from 'react'

interface ConversionPageFeaturesProps {
	sourceFormat?: string
	targetFormat?: string
}

function ConversionPageFeatures({ sourceFormat, targetFormat }: ConversionPageFeaturesProps) {
	// Default format names if not provided
	const sourceFormatDisplay = sourceFormat?.toUpperCase() || 'FILES'
	const targetFormatDisplay = targetFormat?.toUpperCase() || 'FORMAT'

	const features = [
		{
			title: `Lightning-Fast ${sourceFormatDisplay} to ${targetFormatDisplay} Conversion`,
			description: 'Our optimized conversion engine processes your files in seconds, not minutes.',
			icon: (
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
					<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
				</svg>
			)
		},
		{
			title: 'Professional-Grade Security',
			description:
				'Your files are processed with bank-level encryption and never stored on our servers.',
			icon: (
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
					<rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
					<path d="M7 11V7a5 5 0 0 1 10 0v4" />
				</svg>
			)
		},
		{
			title: 'Privacy First',
			description: 'No tracking, no data collection, and automatic file deletion after conversion.',
			icon: (
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
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
					<path d="m9 12 2 2 4-4" />
				</svg>
			)
		},
		{
			title: 'No Registration Required',
			description:
				'Start converting immediately without creating an account or providing personal information.',
			icon: (
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
					<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
					<circle cx="9" cy="7" r="4" />
					<line x1="19" x2="19" y1="8" y2="14" />
					<line x1="22" x2="16" y1="11" y2="11" />
				</svg>
			)
		}
	]

	// For sidebar usage in conversion pages, we'll use a more compact layout
	return (
		<div className="space-y-6">
			<div className="mb-4">
				<h3 className="relative mb-4 inline-block font-heading text-xl font-semibold text-deepNavy">
					Why Choose TrustyConvert
					<span className="absolute -bottom-1 left-0 h-1 w-full bg-gradient-to-r from-trustTeal to-trustTeal/30"></span>
				</h3>
			</div>

			{features.map((feature, index) => (
				<div
					key={index}
					className="group relative overflow-hidden rounded-lg border border-trustTeal/20 bg-white p-4 shadow-sm transition-all hover:shadow-md"
				>
					<div className="absolute -right-12 -top-12 h-24 w-24 rounded-full bg-trustTeal/5 transition-transform duration-500 group-hover:scale-150"></div>

					<div className="relative z-10">
						<div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-trustTeal/20 to-trustTeal/30 shadow-inner">
							{feature.icon}
						</div>
						<h4 className="mb-2 text-base font-semibold text-deepNavy">{feature.title}</h4>
						<p className="text-sm text-deepNavy/80">{feature.description}</p>
					</div>
				</div>
			))}
		</div>
	)
}

export default ConversionPageFeatures

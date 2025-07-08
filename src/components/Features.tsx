import React from 'react'

interface FeaturesProps {
	sourceFormat?: string
	targetFormat?: string
	compact?: boolean
}

export function Features({ sourceFormat, targetFormat, compact = false }: FeaturesProps) {
	// Default format names if not provided
	const sourceFormatDisplay = sourceFormat?.toUpperCase() || 'FILES'
	const targetFormatDisplay = targetFormat?.toUpperCase() || 'FORMAT'

	const features = [
		{
			title:
				sourceFormat && targetFormat
					? `Lightning-Fast ${sourceFormatDisplay} to ${targetFormatDisplay} Conversion`
					: 'Lightning-Fast Conversions',
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
		},
		// Only show these features in full mode (not compact)
		...(compact
			? []
			: [
					{
						title: 'Wide Format Support',
						description:
							'Convert between popular document, image, spreadsheet, and presentation formats.',
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
								<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
								<polyline points="14 2 14 8 20 8" />
							</svg>
						)
					},
					{
						title: 'Cross-Platform Compatibility',
						description:
							'Works seamlessly on all devices and browsers without requiring any software installation.',
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
								<rect width="16" height="16" x="4" y="4" rx="2" />
								<rect width="6" height="6" x="9" y="9" rx="1" />
								<path d="M15 2v2" />
								<path d="M15 20v2" />
								<path d="M2 15h2" />
								<path d="M20 15h2" />
							</svg>
						)
					}
				])
	]

	// For compact mode (sidebar usage), use a more compact layout
	if (compact) {
		return (
			<div className="space-y-4">
				<div className="mb-3">
					<h3 className="mb-2 text-sm font-medium text-deepNavy">
						Why Choose TrustyConvert
						<span className="mt-1 block h-0.5 w-16 bg-gradient-to-r from-trustTeal to-trustTeal/30"></span>
					</h3>
				</div>

				{features.map((feature, index) => (
					<div
						key={index}
						className="group relative overflow-hidden rounded-lg border border-trustTeal/10 bg-white p-3 shadow-sm transition-all hover:shadow-md"
					>
						<div className="absolute -right-12 -top-12 h-24 w-24 rounded-full bg-trustTeal/5 transition-transform duration-500 group-hover:scale-150"></div>

						<div className="relative z-10">
							<div className="mb-2 flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-trustTeal/20 to-trustTeal/30 shadow-inner">
								{feature.icon}
							</div>
							<h4 className="mb-1 text-xs font-semibold text-deepNavy">{feature.title}</h4>
							<p className="text-xs text-deepNavy/70">{feature.description}</p>
						</div>
					</div>
				))}
			</div>
		)
	}

	// Full-width section layout (default)
	return (
		<section className="bg-gradient-to-b from-white to-lightGray/30 py-20">
			<div className="trusty-container">
				<div className="mb-14 text-center">
					<h2 className="relative mx-auto mb-6 inline-block font-heading text-3xl font-medium tracking-tight text-deepNavy md:text-4xl">
						Why Choose TrustyConvert
						<span className="absolute -bottom-2 left-0 h-1 w-full bg-gradient-to-r from-trustTeal to-trustTeal/30"></span>
					</h2>
					<p className="mx-auto max-w-2xl text-lg text-deepNavy/80">
						Our platform combines speed, security, and simplicity to provide the best file
						conversion experience.
					</p>
				</div>

				<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
					{features.map((feature, index) => (
						<div
							key={index}
							className="group relative overflow-hidden rounded-xl border border-trustTeal/20 bg-white p-8 shadow-DEFAULT transition-all hover:shadow-lg"
						>
							<div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-trustTeal/5 transition-transform duration-500 group-hover:scale-150"></div>

							<div className="relative z-10">
								<div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-trustTeal/20 to-trustTeal/30 shadow-inner">
									{feature.icon}
								</div>
								<h3 className="mb-4 text-xl font-medium text-deepNavy">{feature.title}</h3>
								<p className="text-base text-deepNavy/80">{feature.description}</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}

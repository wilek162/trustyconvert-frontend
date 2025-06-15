import React from 'react'

export function Features() {
	const features = [
		{
			title: 'Lightning-Fast Conversions',
			description: 'Our optimized conversion engine processes your files in seconds, not minutes.',
			icon: (
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
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
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
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
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					className="text-trustTeal"
				>
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
					<path d="m9 12 2 2 4-4" />
				</svg>
			)
		},
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
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					className="text-trustTeal"
				>
					<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
					<polyline points="14 2 14 8 20 8" />
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
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					className="text-trustTeal"
				>
					<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
					<circle cx="9" cy="7" r="4" />
					<line x1="19" x2="19" y1="8" y2="14" />
					<line x1="22" x2="16" y1="11" y2="11" />
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
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
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
	]

	return (
		<section className="trusty-section bg-white">
			<div className="trusty-container">
				<div className="mb-12 text-center">
					<h2 className="mb-4">Why Choose TrustyConvert</h2>
					<p className="mx-auto max-w-2xl text-lg text-muted-foreground">
						Our platform combines speed, security, and simplicity to provide the best file
						conversion experience.
					</p>
				</div>

				<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
					{features.map((feature, index) => (
						<div key={index} className="trusty-card">
							<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-trustTeal/10">
								{feature.icon}
							</div>
							<h3 className="mb-2 text-xl font-medium">{feature.title}</h3>
							<p className="text-muted-foreground">{feature.description}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}

import React from 'react'

const benefits = [
	{
		title: '100% Secure',
		description:
			'Your files are encrypted during transfer and automatically deleted after conversion.',
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
			>
				<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
			</svg>
		)
	},
	{
		title: 'High Quality Conversions',
		description:
			'Our advanced algorithms ensure the highest quality file conversions with accurate formatting.',
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
			>
				<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
				<polyline points="13 2 13 9 20 9"></polyline>
			</svg>
		)
	},
	{
		title: 'Fast & Free',
		description:
			'Convert files in seconds with no registration required. All features are completely free.',
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
			>
				<circle cx="12" cy="12" r="10"></circle>
				<polyline points="12 6 12 12 16 14"></polyline>
			</svg>
		)
	}
]

export function BenefitsSection() {
	return (
		<section className="bg-lightGray py-16">
			<div className="trusty-container">
				<div className="mb-12 text-center">
					<h2 className="relative mx-auto mb-6 inline-block font-heading text-3xl font-semibold text-deepNavy md:text-4xl">
						Why Choose TrustyConvert?
						<span className="absolute -bottom-2 left-0 h-1 w-full bg-gradient-to-r from-trustTeal to-trustTeal/30"></span>
					</h2>
					<p className="mx-auto max-w-2xl text-lg text-deepNavy/80">
						Our platform is designed with your needs in mind
					</p>
				</div>

				<div className="grid gap-8 md:grid-cols-3">
					{benefits.map((benefit, index) => (
						<div
							key={index}
							className="trusty-card rounded-card border border-trustTeal/20 bg-white p-8 text-center shadow-DEFAULT transition-all hover:shadow-lg"
						>
							<div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-trustTeal/20 to-trustTeal/30 text-trustTeal shadow-inner">
								{benefit.icon}
							</div>
							<h3 className="mb-4 text-xl font-semibold text-deepNavy">{benefit.title}</h3>
							<p className="text-base text-deepNavy/70">{benefit.description}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}

export default BenefitsSection

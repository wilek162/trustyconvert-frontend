import React from 'react'

interface CallToActionProps {
	title?: string
	description?: string
	buttonText?: string
	buttonHref?: string
	showFeatures?: boolean
}

export function CallToAction({
	title = 'Ready to Convert Your Files?',
	description = 'Experience lightning-fast file conversion with professional-grade security. No registration required.',
	buttonText = 'Convert Now',
	buttonHref = '/',
	showFeatures = true
}: CallToActionProps) {
	return (
		<section className="bg-deepNavy py-16 text-white">
			<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
				<div className="flex flex-col items-center justify-between gap-8 md:flex-row">
					<div className="max-w-xl">
						<h2 className="mb-4 text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>
						<p className="mb-6 text-gray-300">{description}</p>
						<a
							href={buttonHref}
							className="inline-flex items-center justify-center rounded-full bg-trustTeal px-6 py-3 text-base font-medium text-white shadow-md transition-all duration-200 hover:bg-trustTeal/90 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-trustTeal/50 focus:ring-offset-2 focus:ring-offset-deepNavy"
						>
							{buttonText}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="ml-2 h-5 w-5"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fillRule="evenodd"
									d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
									clipRule="evenodd"
								/>
							</svg>
						</a>
					</div>

					{showFeatures && (
						<div className="rounded-xl border border-trustTeal/20 bg-deepNavy/50 p-6 shadow-lg">
							<div className="flex flex-col gap-4">
								<div className="flex items-center gap-3">
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
										<path d="m9 12 2 2 4-4"></path>
										<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
									</svg>
									<span>No registration required</span>
								</div>
								<div className="flex items-center gap-3">
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
										<path d="m9 12 2 2 4-4"></path>
										<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
									</svg>
									<span>Files deleted after conversion</span>
								</div>
								<div className="flex items-center gap-3">
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
										<path d="m9 12 2 2 4-4"></path>
										<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
									</svg>
									<span>Bank-level encryption</span>
								</div>
								<div className="flex items-center gap-3">
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
										<path d="m9 12 2 2 4-4"></path>
										<path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
									</svg>
									<span>Unlimited conversions</span>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</section>
	)
}

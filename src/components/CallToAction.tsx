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
		<section className="bg-gradient-to-b from-deepNavy to-deepNavy/90 py-20 text-white">
			<div className="trusty-container">
				<div className="flex flex-col items-center justify-between gap-8 md:flex-row">
					<div className="max-w-xl">
						<h2 className="relative mb-6 inline-block font-heading text-3xl font-medium tracking-tight md:text-4xl">
							{title}
							<span className="absolute -bottom-2 left-0 h-1 w-full bg-gradient-to-r from-trustTeal to-trustTeal/30"></span>
						</h2>
						<p className="mb-8 text-lg text-gray-200">{description}</p>
						<a
							href={buttonHref}
							className="inline-flex items-center justify-center rounded-button bg-trustTeal px-6 py-3 text-base font-medium text-white shadow-DEFAULT transition-all duration-200 ease-in-out hover:bg-trustTeal/90 hover:shadow-md focus:ring-2 focus:ring-trustTeal/50 focus:ring-offset-2 focus:ring-offset-deepNavy"
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
						<div className="group relative overflow-hidden rounded-card border border-trustTeal/20 bg-deepNavy/50 p-8 shadow-DEFAULT backdrop-blur-sm">
							<div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-trustTeal/5 transition-transform duration-500 group-hover:scale-150"></div>

							<div className="relative z-10 flex flex-col gap-5">
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-trustTeal/20 to-trustTeal/30 shadow-inner">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="20"
											height="20"
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
									</div>
									<span className="text-base text-gray-200">No registration required</span>
								</div>
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-trustTeal/20 to-trustTeal/30 shadow-inner">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="20"
											height="20"
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
									</div>
									<span className="text-base text-gray-200">Files deleted after conversion</span>
								</div>
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-trustTeal/20 to-trustTeal/30 shadow-inner">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="20"
											height="20"
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
									</div>
									<span className="text-base text-gray-200">Bank-level encryption</span>
								</div>
								<div className="flex items-center gap-3">
									<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-trustTeal/20 to-trustTeal/30 shadow-inner">
										<svg
											xmlns="http://www.w3.org/2000/svg"
											width="20"
											height="20"
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
									</div>
									<span className="text-base text-gray-200">Unlimited conversions</span>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</section>
	)
}

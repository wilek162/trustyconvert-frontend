import React, { useState, useEffect } from 'react'
import { ConversionFlow } from '@/components/features/conversion/ConversionFlow'

export function Hero() {
	// Use client-side only rendering to prevent hydration mismatches
	const [isClient, setIsClient] = useState(false)

	// Set client-side rendering flag
	useEffect(() => {
		setIsClient(true)
	}, [])

	return (
		<section className="relative bg-gradient-to-b from-lightGray/30 to-white py-16">
			{/* Background elements */}
			<div className="absolute inset-0 -z-10 overflow-hidden">
				<div className="absolute -left-[10%] -top-[10%] h-[500px] w-[500px] rounded-full bg-trustTeal/5 blur-3xl"></div>
				<div className="absolute -bottom-[10%] -right-[10%] h-[400px] w-[400px] rounded-full bg-trustTeal/5 blur-3xl"></div>
				<div className="absolute right-[5%] top-[30%] h-[300px] w-[300px] rounded-full bg-accentOrange/5 blur-3xl"></div>
			</div>

			<div className="trusty-container flex flex-col">
				<div className="mb-16 text-center">
					<h1 className="relative mx-auto mb-6 inline-block font-heading text-4xl font-semibold tracking-tight text-deepNavy md:text-5xl">
						<span className="relative inline-block">
							Fast, Secure
							<span className="absolute -bottom-2 left-0 h-1 w-full bg-gradient-to-r from-trustTeal to-trustTeal/30"></span>
						</span>{' '}
						<span className="text-deepNavy">File Conversion</span>
					</h1>
					<p className="mx-auto max-w-2xl text-lg text-deepNavy/80">
						Convert your files with lightning speed and professional-grade security.
					</p>
				</div>

				<div className="relative mb-16 flex justify-center">
					<div className="flex w-full max-w-2xl justify-center">
						{/* Only render ConversionFlow on client-side to prevent hydration issues */}
						{isClient ? (
							<ConversionFlow title="Convert Your File" />
						) : (
							<div className="mx-auto w-full max-w-3xl overflow-hidden rounded-xl border-0 bg-white shadow-DEFAULT">
								<div className="border-b border-border/50 bg-gradient-to-r from-trustTeal/20 to-transparent pb-4 pt-5">
									<h2 className="text-center text-xl font-medium text-deepNavy">
										Convert Your File
									</h2>
								</div>
								<div className="bg-gradient-to-b from-white to-lightGray/10 p-6">
									<div className="flex flex-col items-center justify-center py-8">
										<div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-trustTeal/20 border-t-trustTeal"></div>
										<p className="text-deepNavy">Loading conversion tool...</p>
									</div>
								</div>
								<div className="flex justify-center border-t border-border/50 bg-gradient-to-b from-lightGray/10 to-lightGray/20 px-8 py-7">
									<button
										disabled
										className="w-full max-w-xs rounded-button bg-trustTeal/50 px-6 py-2 text-white"
									>
										Loading...
									</button>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Feature badges with improved contrast */}
				<div className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-6">
					<div className="flex items-center rounded-full bg-white px-5 py-3 shadow-DEFAULT">
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
							className="mr-2 text-trustTeal"
						>
							<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
						</svg>
						<span className="text-base font-medium text-deepNavy">Lightning-fast</span>
					</div>

					<div className="flex items-center rounded-full bg-white px-5 py-3 shadow-DEFAULT">
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
							className="mr-2 text-trustTeal"
						>
							<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
							<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
						</svg>
						<span className="text-base font-medium text-deepNavy">100% Secure</span>
					</div>

					<div className="flex items-center rounded-full bg-white px-5 py-3 shadow-DEFAULT">
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
							className="mr-2 text-trustTeal"
						>
							<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
							<circle cx="9" cy="7" r="4"></circle>
							<path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
							<path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
						</svg>
						<span className="text-base font-medium text-deepNavy">No File Storage</span>
					</div>
				</div>
			</div>
		</section>
	)
}

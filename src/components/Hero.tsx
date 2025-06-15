import React from 'react'
import { ConversionForm } from './ConversionForm'

interface HeroProps {
	onFileConvert: (file: File, targetFormat: string) => void
	isLoading?: boolean
}

export function Hero({ onFileConvert, isLoading = false }: HeroProps) {
	return (
		<section className="relative overflow-hidden bg-gradient-to-b from-white to-lightGray py-16 md:py-24">
			{/* Background pattern with reduced opacity */}
			<div className="bg-pattern absolute inset-0 opacity-10"></div>

			{/* Accent decorations */}
			<div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-trustTeal/10 blur-3xl"></div>
			<div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-trustTeal/10 blur-3xl"></div>

			<div className="trusty-container relative">
				<div className="mx-auto mb-12 max-w-3xl text-center">
					<h1 className="mb-6 bg-gradient-to-r from-deepNavy to-trustTeal bg-clip-text font-heading text-4xl font-semibold tracking-tight text-transparent md:text-5xl">
						Fast, Secure File Conversion
					</h1>
					<p className="mx-auto mb-8 max-w-2xl text-lg text-deepNavy/80">
						Convert your files with lightning speed and professional-grade security. No tracking, no
						storage - your privacy comes first.
					</p>
					<div className="flex flex-wrap items-center justify-center gap-6">
						<div className="flex items-center space-x-3 rounded-full bg-white/70 px-4 py-2 shadow-sm">
							<div className="flex h-8 w-8 items-center justify-center rounded-full bg-trustTeal/10">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									strokeLinejoin="round"
									className="text-trustTeal"
								>
									<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
								</svg>
							</div>
							<span className="text-sm font-medium">Lightning-fast</span>
						</div>
						<div className="flex items-center space-x-3 rounded-full bg-white/70 px-4 py-2 shadow-sm">
							<div className="flex h-8 w-8 items-center justify-center rounded-full bg-trustTeal/10">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									className="text-trustTeal"
								>
									<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
								</svg>
							</div>
							<span className="text-sm font-medium">100% Secure</span>
						</div>
						<div className="flex items-center space-x-3 rounded-full bg-white/70 px-4 py-2 shadow-sm">
							<div className="flex h-8 w-8 items-center justify-center rounded-full bg-trustTeal/10">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									className="text-trustTeal"
								>
									<path d="M18 8h1a4 4 0 0 1 0 8h-1" />
									<path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
									<line x1="6" x2="6" y1="1" y2="4" />
									<line x1="10" x2="10" y1="1" y2="4" />
									<line x1="14" x2="14" y1="1" y2="4" />
								</svg>
							</div>
							<span className="text-sm font-medium">No File Storage</span>
						</div>
					</div>
				</div>

				<div className="relative">
					<ConversionForm onSubmit={onFileConvert} isLoading={isLoading} />

					{/* Decorative elements */}
					<div className="absolute -right-6 -top-6 -z-10 h-32 w-32 rounded-full bg-accentOrange/5 blur-2xl"></div>
					<div className="absolute -bottom-6 -left-6 -z-10 h-32 w-32 rounded-full bg-accentOrange/5 blur-2xl"></div>
				</div>

				<div className="mt-12 text-center">
					<p className="text-sm text-deepNavy/60">
						TrustyConvert supports a wide range of file formats including PDF, DOCX, JPG, PNG, XLSX,
						and more.
					</p>
				</div>
			</div>
		</section>
	)
}

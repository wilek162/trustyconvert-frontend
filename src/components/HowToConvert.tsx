import React from 'react'

interface HowToConvertProps {
	sourceFormat: string
	targetFormat: string
	sourceName?: string
	targetName?: string
}

export function HowToConvert({
	sourceFormat,
	targetFormat,
	sourceName,
	targetName
}: HowToConvertProps) {
	// Use provided names or default to uppercase format IDs
	const sourceFormatDisplay = sourceName || sourceFormat.toUpperCase()
	const targetFormatDisplay = targetName || targetFormat.toUpperCase()

	return (
		<section className="bg-gradient-to-b from-lightGray/30 to-white py-20">
			<div className="trusty-container">
				<div className="mb-14 text-center">
					<h2 className="relative mx-auto mb-6 inline-block font-heading text-3xl font-semibold text-deepNavy md:text-4xl">
						How to Convert {sourceFormatDisplay} to {targetFormatDisplay}
						<span className="absolute -bottom-2 left-0 h-1 w-full bg-gradient-to-r from-trustTeal to-trustTeal/30"></span>
					</h2>
					<p className="mx-auto max-w-2xl text-lg text-deepNavy/80">
						Converting {sourceFormatDisplay} to {targetFormatDisplay} is simple, secure, and
						lightning-fast with TrustyConvert.
					</p>
				</div>

				<div className="grid gap-8 md:grid-cols-3">
					{/* Step 1 */}
					<div className="group relative overflow-hidden rounded-xl border border-trustTeal/20 bg-white p-8 shadow-lg transition-all hover:shadow-xl">
						<div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-trustTeal/5 transition-transform duration-500 group-hover:scale-150"></div>

						<div className="relative z-10">
							<div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-trustTeal/20 to-trustTeal/30 shadow-inner">
								<span className="text-2xl font-bold text-trustTeal">1</span>
							</div>

							<h3 className="mb-4 text-xl font-semibold text-deepNavy">
								Upload Your {sourceFormatDisplay} File
							</h3>

							<p className="text-base text-deepNavy/80">
								Simply drag and drop your {sourceFormatDisplay} file into the conversion area or
								browse to select it from your device.
							</p>
						</div>
					</div>

					{/* Step 2 */}
					<div className="group relative overflow-hidden rounded-xl border border-trustTeal/20 bg-white p-8 shadow-lg transition-all hover:shadow-xl">
						<div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-trustTeal/5 transition-transform duration-500 group-hover:scale-150"></div>

						<div className="relative z-10">
							<div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-trustTeal/20 to-trustTeal/30 shadow-inner">
								<span className="text-2xl font-bold text-trustTeal">2</span>
							</div>

							<h3 className="mb-4 text-xl font-semibold text-deepNavy">
								Convert to {targetFormatDisplay}
							</h3>

							<p className="text-base text-deepNavy/80">
								Our optimized conversion engine will process your {sourceFormatDisplay} file with
								the highest quality settings.
							</p>
						</div>
					</div>

					{/* Step 3 */}
					<div className="group relative overflow-hidden rounded-xl border border-trustTeal/20 bg-white p-8 shadow-lg transition-all hover:shadow-xl">
						<div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-trustTeal/5 transition-transform duration-500 group-hover:scale-150"></div>

						<div className="relative z-10">
							<div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-trustTeal/20 to-trustTeal/30 shadow-inner">
								<span className="text-2xl font-bold text-trustTeal">3</span>
							</div>

							<h3 className="mb-4 text-xl font-semibold text-deepNavy">
								Download Your {targetFormatDisplay} File
							</h3>

							<p className="text-base text-deepNavy/80">
								Once conversion is complete, download your {targetFormatDisplay} file instantly. No
								registration or email required.
							</p>
						</div>
					</div>
				</div>

				<div className="mt-16 rounded-xl border border-trustTeal/20 bg-gradient-to-r from-trustTeal/10 to-white p-8 shadow-md">
					<div className="flex flex-col items-center justify-between gap-6 md:flex-row">
						<div>
							<h3 className="mb-2 text-xl font-semibold text-deepNavy">
								Ready to convert {sourceFormatDisplay} to {targetFormatDisplay}?
							</h3>
							<p className="text-deepNavy/80">
								Experience fast, secure file conversion with TrustyConvert today.
							</p>
						</div>
						<a
							href="#convert"
							className="flex items-center rounded-lg bg-trustTeal px-8 py-3 font-medium text-white shadow-md transition-all hover:bg-trustTeal/90 hover:shadow-lg focus:ring-2 focus:ring-trustTeal/50 focus:ring-offset-2"
						>
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
								className="mr-2"
							>
								<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
								<polyline points="17 8 12 3 7 8"></polyline>
								<line x1="12" y1="3" x2="12" y2="15"></line>
							</svg>
							Start Converting
						</a>
					</div>
				</div>
			</div>
		</section>
	)
}

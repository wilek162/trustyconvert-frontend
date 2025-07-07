import React, { useEffect, useState } from 'react'
import formatService, { FORMAT_CATEGORIES } from '@/lib/services/formatService'
import type { ConversionFormat } from '@/lib/types/api'

export function ConversionSitemap() {
	const [formatCategories, setFormatCategories] = useState<any[]>([])
	
	// Load format data on component mount
	useEffect(() => {
		async function loadFormatData() {
			const formats = await formatService.getAllFormats()
			
			// Create category data with icons
			const categories = Object.entries(FORMAT_CATEGORIES).map(([categoryId, category]) => {
				return {
					id: categoryId,
					name: category.name,
					formats: category.formats,
					icon: getCategoryIcon(categoryId)
				}
			})
			
			setFormatCategories(categories)
		}
		
		loadFormatData()
	}, [])
	
	// Get icon for a category
	function getCategoryIcon(categoryId: string) {
		switch(categoryId) {
			case 'document':
				return (
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
			case 'image':
				return (
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
				)
			case 'spreadsheet':
				return (
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
				)
			case 'presentation':
				return (
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
			default:
				return (
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
					</svg>
				)
		}
	}

	return (
		<section className="bg-white py-20">
			<div className="trusty-container">
				<div className="mb-14 text-center">
					<h2 className="relative mx-auto mb-6 inline-block font-heading text-3xl font-semibold text-deepNavy md:text-4xl">
						Supported Formats
						<span className="absolute -bottom-2 left-0 h-1 w-full bg-gradient-to-r from-trustTeal to-trustTeal/30"></span>
					</h2>
					<p className="mx-auto max-w-2xl text-lg text-deepNavy/80">
						TrustyConvert supports a wide range of file formats for all your conversion needs.
					</p>
				</div>

				<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
					{formatCategories.map((category) => (
						<div
							key={category.id}
							className="group rounded-xl border border-trustTeal/20 bg-white p-6 shadow-md transition-all hover:shadow-lg"
						>
							<div className="mb-5 flex items-center">
								<div className="mr-3 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-trustTeal/20 to-trustTeal/30 shadow-inner group-hover:bg-trustTeal/30">
									{category.icon}
								</div>
								<h3 className="text-xl font-semibold text-deepNavy">{category.name}</h3>
							</div>

							<div className="flex flex-wrap gap-2">
								{category.formats.map((formatId: string) => {
									return (
										<a
											key={formatId}
											href={`/all-conversions#${formatId}`}
											className="rounded-md bg-lightGray px-2.5 py-1 text-sm font-medium text-deepNavy/80 hover:bg-trustTeal/10 hover:text-deepNavy"
										>
											.{formatId}
										</a>
									)
								})}
							</div>
						</div>
					))}
				</div>

				<div className="mt-10 text-center">
					<p className="text-base text-deepNavy/70">
						Don't see the format you need?{' '}
						<a href="#" className="text-trustTeal hover:underline">
							Contact us
						</a>{' '}
						to request additional formats.
					</p>
				</div>
			</div>
		</section>
	)
}

export default ConversionSitemap

import React, { useEffect, useState } from 'react'
import { getAllFormats, FORMAT_CATEGORIES } from '@/lib/services/formatService'
import type { ConversionFormat } from '@/lib/types/api'

interface FormatCategory {
	name: string
	formats: string[]
	icon: React.ReactNode
}

export function SupportedFormats() {
	const [formatCategories, setFormatCategories] = useState<FormatCategory[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		async function loadFormats() {
			try {
				console.log('SupportedFormats: Loading formats...')
				setIsLoading(true)
				setError(null)

				// Load formats from the static JSON file
				const formats = await getAllFormats()
				console.log('SupportedFormats: Formats loaded:', formats.length, 'formats')

				// Use mock data if no formats were loaded
				if (!formats || formats.length === 0) {
					console.error('SupportedFormats: No formats loaded, using hardcoded categories')
					// Use hardcoded format categories as fallback
					const hardcodedCategories = Object.entries(FORMAT_CATEGORIES).map(
						([categoryId, category]) => {
							return {
								name: category.name,
								formats: category.formats,
								icon: getCategoryIcon(categoryId)
							}
						}
					)

					setFormatCategories(hardcodedCategories)
					setIsLoading(false)
					return
				}

				// Group formats by category
				const formatsByCategory: Record<string, string[]> = {}

				// Initialize categories from FORMAT_CATEGORIES
				Object.entries(FORMAT_CATEGORIES).forEach(([categoryId, category]) => {
					formatsByCategory[categoryId] = []
				})

				// Group the formats by category
				formats.forEach((format) => {
					// Find which category this format belongs to
					let foundCategory = false
					for (const [categoryId, category] of Object.entries(FORMAT_CATEGORIES)) {
						if (category.formats.includes(format.id)) {
							if (!formatsByCategory[categoryId]) {
								formatsByCategory[categoryId] = []
							}
							if (!formatsByCategory[categoryId].includes(format.id)) {
								formatsByCategory[categoryId].push(format.id)
							}
							foundCategory = true
							break
						}
					}

					if (!foundCategory) {
						console.log('Format not categorized:', format.id)
					}
				})

				console.log('SupportedFormats: Formats grouped by category:', formatsByCategory)

				// Create the categories array with icons
				const categories = Object.entries(FORMAT_CATEGORIES)
					.map(([categoryId, category]) => {
						return {
							name: category.name,
							formats: formatsByCategory[categoryId] || [],
							icon: getCategoryIcon(categoryId)
						}
					})
					.filter((category) => category.formats.length > 0)

				console.log('SupportedFormats: Final categories:', categories.length, 'categories')
				setFormatCategories(categories)
			} catch (error) {
				console.error('SupportedFormats: Error loading formats:', error)
				setError('Failed to load format data. Please try again later.')

				// Use hardcoded format categories as fallback
				const hardcodedCategories = Object.entries(FORMAT_CATEGORIES).map(
					([categoryId, category]) => {
						return {
							name: category.name,
							formats: category.formats,
							icon: getCategoryIcon(categoryId)
						}
					}
				)

				setFormatCategories(hardcodedCategories)
			} finally {
				setIsLoading(false)
			}
		}

		loadFormats()
	}, [])

	// Get icon for a category
	function getCategoryIcon(categoryId: string) {
		switch (categoryId) {
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

	if (isLoading) {
		return (
			<section className="bg-white py-20">
				<div className="trusty-container text-center">
					<p>Loading supported formats...</p>
				</div>
			</section>
		)
	}

	if (error && formatCategories.length === 0) {
		return (
			<section className="bg-white py-20">
				<div className="trusty-container text-center">
					<p className="text-lg text-red-600">{error}</p>
					<button
						onClick={() => window.location.reload()}
						className="mt-4 rounded-md bg-trustTeal px-4 py-2 text-white hover:bg-trustTeal/90"
					>
						Retry
					</button>
				</div>
			</section>
		)
	}

	// Ensure we have categories to display
	if (formatCategories.length === 0) {
		// Use hardcoded format categories as fallback
		const hardcodedCategories = Object.entries(FORMAT_CATEGORIES).map(([categoryId, category]) => {
			return {
				name: category.name,
				formats: category.formats,
				icon: getCategoryIcon(categoryId)
			}
		})

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
						{hardcodedCategories.map((category, index) => (
							<div
								key={index}
								className="group rounded-xl border border-trustTeal/20 bg-white p-6 shadow-md transition-all hover:shadow-lg"
							>
								<div className="mb-5 flex items-center">
									<div className="mr-3 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-trustTeal/20 to-trustTeal/30 shadow-inner group-hover:bg-trustTeal/30">
										{category.icon}
									</div>
									<h3 className="text-xl font-semibold text-deepNavy">{category.name}</h3>
								</div>

								<div className="flex flex-wrap gap-2">
									{category.formats.map((format, idx) => (
										<span
											key={idx}
											className="rounded-md bg-lightGray px-2.5 py-1 text-sm font-medium text-deepNavy/80"
										>
											.{format.toLowerCase()}
										</span>
									))}
								</div>
							</div>
						))}
					</div>

					<div className="mt-10 text-center">
						<p className="mb-4 text-base text-deepNavy/70">
							Don't see the format you need?{' '}
							<a href="#" className="text-trustTeal hover:underline">
								Contact us
							</a>{' '}
							to request additional formats.
						</p>

						<a
							href="/all-conversions"
							className="inline-flex items-center justify-center rounded-full bg-trustTeal px-6 py-3 text-sm font-medium text-white transition-all hover:bg-trustTeal/90 hover:shadow-md"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								className="mr-2"
							>
								<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
								<polyline points="14 2 14 8 20 8" />
								<line x1="16" y1="13" x2="8" y2="13" />
								<line x1="16" y1="17" x2="8" y2="17" />
								<line x1="10" y1="9" x2="8" y2="9" />
							</svg>
							View All Conversion Options
						</a>
					</div>
				</div>
			</section>
		)
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
					{formatCategories.map((category, index) => (
						<div
							key={index}
							className="group rounded-xl border border-trustTeal/20 bg-white p-6 shadow-md transition-all hover:shadow-lg"
						>
							<div className="mb-5 flex items-center">
								<div className="mr-3 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-trustTeal/20 to-trustTeal/30 shadow-inner group-hover:bg-trustTeal/30">
									{category.icon}
								</div>
								<h3 className="text-xl font-semibold text-deepNavy">{category.name}</h3>
							</div>

							<div className="flex flex-wrap gap-2">
								{category.formats.map((format, idx) => (
									<span
										key={idx}
										className="rounded-md bg-lightGray px-2.5 py-1 text-sm font-medium text-deepNavy/80"
									>
										.{format.toLowerCase()}
									</span>
								))}
							</div>
						</div>
					))}
				</div>

				<div className="mt-10 text-center">
					<p className="mb-4 text-base text-deepNavy/70">
						Don't see the format you need?{' '}
						<a href="#" className="text-trustTeal hover:underline">
							Contact us
						</a>{' '}
						to request additional formats.
					</p>

					<a
						href="/all-conversions"
						className="inline-flex items-center justify-center rounded-full bg-trustTeal px-6 py-3 text-sm font-medium text-white transition-all hover:bg-trustTeal/90 hover:shadow-md"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							className="mr-2"
						>
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
							<polyline points="14 2 14 8 20 8" />
							<line x1="16" y1="13" x2="8" y2="13" />
							<line x1="16" y1="17" x2="8" y2="17" />
							<line x1="10" y1="9" x2="8" y2="9" />
						</svg>
						View All Conversion Options
					</a>
				</div>
			</div>
		</section>
	)
}

/**
 * Schema.org structured data type definitions
 */

/**
 * Generic structured data type that supports schema.org JSON-LD format
 */
export interface StructuredData {
	'@context': string
	'@type': string
	[key: string]:
		| string
		| number
		| boolean
		| null
		| undefined
		| StructuredData
		| Array<string | number | boolean | StructuredData>
}

/**
 * WebApplication schema type
 */
export interface WebApplicationSchema extends StructuredData {
	'@type': 'WebApplication'
	name: string
	url: string
	description: string
	applicationCategory: string
	operatingSystem: string
	offers: Array<{
		'@type': string
		price: string
		priceCurrency: string
		availability: string
	}>
	featureList: string[]
	aggregateRating: {
		'@type': string
		ratingValue: string
		ratingCount: string
		bestRating: string
		worstRating: string
	}
	provider: {
		'@type': string
		name: string
		url: string
	}
	browserRequirements: string
	permissions: string
	softwareVersion: string
}

/**
 * Organization schema type
 */
export interface OrganizationSchema extends StructuredData {
	'@type': 'Organization'
	name: string
	url: string
	logo?: string
	sameAs?: string[]
}

/**
 * BreadcrumbList schema type
 */
export interface BreadcrumbListSchema extends StructuredData {
	'@type': 'BreadcrumbList'
	itemListElement: Array<{
		'@type': 'ListItem'
		position: number
		name: string
		item: string
	}>
}

/**
 * Centralized SEO configuration for TrustyConvert
 * This file contains all SEO-related configuration settings
 */

export const siteConfig = {
	siteName: 'TrustyConvert',
	siteUrl: 'https://trustyconvert.com',
	defaultTitle: 'TrustyConvert - Fast & Secure File Conversion',
	defaultDescription:
		'Convert files quickly and securely with TrustyConvert. No registration required, your privacy guaranteed.',
	defaultImage: '/images/og-image.jpg',
	twitterHandle: '@trustyconvert',
	locale: 'en_US'
}

/**
 * Format-specific SEO configuration
 * @param format Source format
 * @param targetFormat Target format
 * @returns Format-specific SEO configuration
 */
export const formatPageConfig = (format: string, targetFormat: string) => ({
	title: `Convert ${format.toUpperCase()} to ${targetFormat.toUpperCase()} - Free Online Converter`,
	description: `Convert your ${format} files to ${targetFormat} format online. Fast, secure, and free file conversion with TrustyConvert.`,
	structuredData: {
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: `${format.toUpperCase()} to ${targetFormat.toUpperCase()} Converter`,
		applicationCategory: 'UtilityApplication',
		operatingSystem: 'All',
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'USD'
		},
		description: `Convert your ${format} files to ${targetFormat} format online. Fast, secure, and free file conversion with TrustyConvert.`
	}
})

/**
 * Blog-specific SEO configuration
 */
export const blogConfig = {
	title: 'TrustyConvert Blog - File Conversion Tips & Guides',
	description:
		'Learn about file formats, conversion techniques, and digital document management with TrustyConvert.',
	postsPerPage: 9,
	categories: [
		{
			name: 'Tutorials',
			slug: 'tutorials',
			description: 'Step-by-step guides for file conversions and document management.'
		},
		{
			name: 'File Formats',
			slug: 'file-formats',
			description: 'Detailed information about different file formats and their uses.'
		},
		{
			name: 'Security',
			slug: 'security',
			description: 'Best practices for secure file handling and conversion.'
		},
		{
			name: 'Productivity',
			slug: 'productivity',
			description: 'Tips and tricks to improve your workflow with file conversions.'
		},
		{
			name: 'News',
			slug: 'news',
			description: 'Latest updates about TrustyConvert and file conversion technology.'
		}
	],
	structuredData: {
		'@context': 'https://schema.org',
		'@type': 'Blog',
		name: 'TrustyConvert Blog',
		description:
			'Learn about file formats, conversion techniques, and digital document management.',
		url: 'https://trustyconvert.com/blog',
		publisher: {
			'@type': 'Organization',
			name: 'TrustyConvert',
			logo: {
				'@type': 'ImageObject',
				url: 'https://trustyconvert.com/logo.png'
			}
		}
	}
}

/**
 * FAQ structured data generator
 * @param faqs Array of FAQ items
 * @returns FAQ structured data
 */
export const generateFAQStructuredData = (faqs: Array<{ question: string; answer: string }>) => ({
	'@context': 'https://schema.org',
	'@type': 'FAQPage',
	mainEntity: faqs.map((faq) => ({
		'@type': 'Question',
		name: faq.question,
		acceptedAnswer: {
			'@type': 'Answer',
			text: faq.answer
		}
	}))
})

/**
 * Generate breadcrumbs for SEO
 * @param items Array of breadcrumb items
 * @returns Breadcrumb structured data
 */
export const generateBreadcrumbStructuredData = (items: Array<{ name: string; url: string }>) => ({
	'@context': 'https://schema.org',
	'@type': 'BreadcrumbList',
	itemListElement: items.map((item, index) => ({
		'@type': 'ListItem',
		position: index + 1,
		name: item.name,
		item: `https://trustyconvert.com${item.url}`
	}))
})

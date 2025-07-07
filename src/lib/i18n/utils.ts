import type { AstroGlobal } from 'astro'
import { LANGUAGES, DEFAULT_LANGUAGE, extractLanguageFromPath, formatLocalizedPath } from './config'

/**
 * Get the current language from Astro context
 */
export function getCurrentLanguage(Astro: AstroGlobal): string {
	return Astro.locals.lang || DEFAULT_LANGUAGE.code
}

/**
 * Format a date according to the locale
 */
export function formatDate(date: Date | string, lang = DEFAULT_LANGUAGE.code): string {
	const dateObj = typeof date === 'string' ? new Date(date) : date

	// Get locale from language
	const locale = LANGUAGES.find((l) => l.code === lang)?.locale || 'en-US'

	return dateObj.toLocaleDateString(locale, {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	})
}

/**
 * Get localized URL for the current page in another language
 */
export function getLocalizedUrl(Astro: AstroGlobal, lang: string): string {
	const { pathname } = Astro.url
	const { cleanPath } = extractLanguageFromPath(pathname)

	return `${Astro.url.origin}${formatLocalizedPath(cleanPath, lang)}`
}

/**
 * Create a language switcher function for use in Astro components
 */
export function createLanguageSwitcher(Astro: AstroGlobal) {
	return (lang: string) => {
		const { pathname } = Astro.url
		const { cleanPath } = extractLanguageFromPath(pathname)

		return formatLocalizedPath(cleanPath, lang)
	}
}

/**
 * Generate localized URL for any path
 */
export function getLocalizedPath(path: string, lang: string): string {
	return formatLocalizedPath(path, lang)
}

/**
 * Format a number according to the locale
 */
export function formatNumber(
	number: number,
	lang = DEFAULT_LANGUAGE.code,
	options?: Intl.NumberFormatOptions
): string {
	// Get locale from language
	const locale = LANGUAGES.find((l) => l.code === lang)?.locale || 'en-US'

	return new Intl.NumberFormat(locale, options).format(number)
}

/**
 * Generate static paths for language-specific routes
 * This is a utility function for Astro's getStaticPaths
 * 
 * @param additionalParams Additional parameters to include in the static paths
 * @returns An array of objects with params and props for use with getStaticPaths
 */
export function generateLanguagePaths<T extends Record<string, any>>(
	additionalParams: T[] = [{}] as T[]
) {
	const paths: { params: Record<string, string>; props: Record<string, any> }[] = []

	// For each language (except default), create a path with the language code
	LANGUAGES.filter(lang => lang.code !== DEFAULT_LANGUAGE.code).forEach(lang => {
		additionalParams.forEach(params => {
			paths.push({
				params: { 
					lang: lang.code,
					...params
				},
				props: { 
					lang: lang.code,
					...params
				}
			})
		})
	})

	return paths
}

/**
 * Get current language from Astro params or default
 * This is useful in pages with [lang] parameter
 */
export function getLanguageFromParams(params: Record<string, string>): string {
	return params.lang || DEFAULT_LANGUAGE.code
}

/**
 * Create language-specific routes for all pages
 * This wraps a normal getStaticPaths function to add language-specific routes
 * 
 * @param getPagePaths Function that returns the original page paths
 * @returns A function that returns language-specific paths for all pages
 */
export function createMultilingualPaths<T extends Record<string, any>>(
	getPagePaths: () => { params: T; props?: any }[]
) {
	return function() {
		// Get original page paths
		const originalPaths = getPagePaths()
		
		// Create paths for non-default languages
		const languagePaths = LANGUAGES
			.filter(lang => lang.code !== DEFAULT_LANGUAGE.code)
			.flatMap(lang => {
				return originalPaths.map(({ params, props = {} }) => ({
					params: {
						...params,
						lang: lang.code
					},
					props: {
						...props,
						lang: lang.code
					}
				}))
			})
		
		// Return both original paths and language paths
		return [
			...originalPaths.map(path => ({
				...path,
				props: {
					...path.props,
					lang: DEFAULT_LANGUAGE.code
				}
			})),
			...languagePaths
		]
	}
}

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

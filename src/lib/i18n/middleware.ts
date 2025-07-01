import type { AstroGlobal } from 'astro'
import { LANGUAGES, DEFAULT_LANGUAGE, extractLanguageFromPath } from './config'

// Check if we're in static mode
const isStaticMode = import.meta.env.OUTPUT === 'static'

/**
 * Detect user's preferred language from browser settings
 */
export function detectBrowserLanguage(acceptLanguageHeader: string | null): string {
	if (!acceptLanguageHeader) {
		return DEFAULT_LANGUAGE.code
	}

	// Parse Accept-Language header
	// Example: en-US,en;q=0.9,es;q=0.8,de;q=0.7
	const preferredLanguages = acceptLanguageHeader
		.split(',')
		.map((lang) => {
			const [language, quality = 'q=1.0'] = lang.trim().split(';')
			const q = parseFloat(quality.replace('q=', '')) || 1.0
			return { language: language.split('-')[0], quality: q }
		})
		.sort((a, b) => b.quality - a.quality)

	// Find first matching language
	const match = preferredLanguages.find(({ language }) =>
		LANGUAGES.some((lang) => lang.code === language)
	)

	return match ? match.language : DEFAULT_LANGUAGE.code
}

/**
 * Language middleware for Astro
 * This middleware:
 * 1. Detects the current language from the URL
 * 2. Provides language utilities to the page
 */
export function createLanguageMiddleware() {
	return async function languageMiddleware(context: AstroGlobal) {
		const { url } = context
		const { pathname } = url

		// Extract language from URL path
		const { langCode, cleanPath } = extractLanguageFromPath(pathname)

		// Add language data to locals for use in components
		context.locals.lang = langCode
		context.locals.languages = LANGUAGES
		context.locals.defaultLanguage = DEFAULT_LANGUAGE

		// In static mode, always use default language
		context.locals.detectedLanguage = DEFAULT_LANGUAGE.code

		// Only try to detect browser language in server mode with SSR
		if (!isStaticMode && import.meta.env.SSR && context.request?.headers) {
			try {
				const acceptLanguage = context.request.headers.get('accept-language')
				if (acceptLanguage) {
					context.locals.detectedLanguage = detectBrowserLanguage(acceptLanguage)
				}
			} catch (error) {
				console.error('Error detecting browser language:', error)
			}
		}

		return context
	}
}

/**
 * Generate alternate language URLs for SEO
 * Safe version that doesn't depend on request headers
 */
export function getAlternateLanguages(
	astro: AstroGlobal
): { code: string; name: string; url: string }[] {
	const { pathname } = astro.url
	const { langCode, cleanPath } = extractLanguageFromPath(pathname)
	const origin = astro.url.origin || 'https://trustyconvert.com'

	return LANGUAGES.map((lang) => {
		let url = origin

		if (lang.code !== DEFAULT_LANGUAGE.code) {
			url += `/${lang.code}`
		}

		url += cleanPath === '/' ? '' : cleanPath

		return {
			code: lang.code,
			name: lang.name,
			url
		}
	})
}

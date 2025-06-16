/**
 * i18n configuration for TrustyConvert
 * This file contains all internationalization-related configuration settings
 */

export type Language = {
	code: string
	name: string
	flag: string
	locale: string
	isDefault?: boolean
}

export const LANGUAGES: Language[] = [
	{ code: 'en', name: 'English', flag: '🇺🇸', locale: 'en-US', isDefault: true },
	{ code: 'es', name: 'Español', flag: '🇪🇸', locale: 'es-ES' },
	{ code: 'fr', name: 'Français', flag: '🇫🇷', locale: 'fr-FR' },
	{ code: 'de', name: 'Deutsch', flag: '🇩🇪', locale: 'de-DE' },
	{ code: 'zh', name: '中文', flag: '🇨🇳', locale: 'zh-CN' }
]

export const DEFAULT_LANGUAGE = LANGUAGES.find((lang) => lang.isDefault) || LANGUAGES[0]

/**
 * Get language by code
 */
export function getLanguage(code: string): Language {
	return LANGUAGES.find((lang) => lang.code === code) || DEFAULT_LANGUAGE
}

/**
 * Format URL with language code
 * For default language, no prefix is added
 */
export function formatLocalizedPath(path: string, langCode: string): string {
	// Remove trailing slashes for consistency
	const cleanPath = path.endsWith('/') ? path.slice(0, -1) : path

	// For default language, don't add prefix
	if (langCode === DEFAULT_LANGUAGE.code) {
		return cleanPath || '/'
	}

	// For other languages, add prefix
	return `/${langCode}${cleanPath}`
}

/**
 * Extract language code from URL path
 */
export function extractLanguageFromPath(path: string): { langCode: string; cleanPath: string } {
	const segments = path.split('/').filter(Boolean)

	// Check if the first segment is a language code
	if (segments.length > 0 && LANGUAGES.some((lang) => lang.code === segments[0])) {
		return {
			langCode: segments[0],
			cleanPath: `/${segments.slice(1).join('/')}`
		}
	}

	// Default to default language
	return {
		langCode: DEFAULT_LANGUAGE.code,
		cleanPath: path
	}
}

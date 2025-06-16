import { DEFAULT_LANGUAGE } from '../config'
import en from './en'
import es from './es'
import fr from './fr'
import de from './de'
import zh from './zh'

export type TranslationKey = keyof typeof en

export const translations = {
	en,
	es,
	fr,
	de,
	zh
}

/**
 * Get translation for a key in the specified language
 */
export function t(key: TranslationKey, lang = DEFAULT_LANGUAGE.code): string {
	const langTranslations = translations[lang as keyof typeof translations] || translations.en
	return langTranslations[key] || en[key] || key
}

/**
 * Format a string with variables
 * Example: formatString("Hello {name}", { name: "World" }) => "Hello World"
 */
export function formatString(str: string, variables: Record<string, string | number>): string {
	return Object.entries(variables).reduce((result, [key, value]) => {
		return result.replace(new RegExp(`{${key}}`, 'g'), String(value))
	}, str)
}

/**
 * Translate with variables
 * Example: tFormat("welcome_message", "en", { name: "User" })
 */
export function tFormat(
	key: TranslationKey,
	lang = DEFAULT_LANGUAGE.code,
	variables: Record<string, string | number> = {}
): string {
	const translation = t(key, lang)
	return formatString(translation, variables)
}

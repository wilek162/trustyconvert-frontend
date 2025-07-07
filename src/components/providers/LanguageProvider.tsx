import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { DEFAULT_LANGUAGE, type Language, LANGUAGES, formatLocalizedPath } from '@/lib/i18n/config'
import { t, tFormat, type TranslationKey } from '@/lib/i18n/translations'

type LanguageContextType = {
	lang: string
	setLang: (lang: string) => void
	t: (key: TranslationKey) => string
	tFormat: (key: TranslationKey, variables: Record<string, string | number>) => string
	switchLanguage: (lang: string) => void
	getLocalizedPath: (path: string) => string
	supportedLanguages: Language[]
}

const LanguageContext = createContext<LanguageContextType>({
	lang: DEFAULT_LANGUAGE.code,
	setLang: () => {},
	t: (key) => key,
	tFormat: (key) => key,
	switchLanguage: () => {},
	getLocalizedPath: (path) => path,
	supportedLanguages: LANGUAGES
})

export function LanguageProvider({ children }: { children: ReactNode }) {
	const [lang, setLang] = useState(DEFAULT_LANGUAGE.code)

	useEffect(() => {
		// Get language from HTML tag
		const htmlLang = document.documentElement.lang
		if (htmlLang) {
			setLang(htmlLang)
		}
	}, [])

	// Translation functions that use the current language
	const translate = (key: TranslationKey) => t(key, lang)
	const translateWithVars = (key: TranslationKey, variables: Record<string, string | number>) =>
		tFormat(key, lang, variables)

	// Function to switch language and navigate to the localized version of the current page
	const switchLanguage = (newLang: string) => {
		if (newLang === lang) return

		// Get current path without language prefix
		const pathname = window.location.pathname
		const segments = pathname.split('/').filter(Boolean)
		let pathWithoutLang = pathname

		// Check if the first segment is a language code
		if (segments.length > 0 && LANGUAGES.some((l) => l.code === segments[0])) {
			pathWithoutLang = '/' + segments.slice(1).join('/')
		}

		// If path is empty, use root
		if (pathWithoutLang === '') pathWithoutLang = '/'

		// Navigate to the localized version of the current page
		const newPath = formatLocalizedPath(pathWithoutLang, newLang)
		window.location.href = newPath
	}

	// Function to get localized path for any path
	const getLocalizedPath = (path: string) => formatLocalizedPath(path, lang)

	return (
		<LanguageContext.Provider
			value={{
				lang,
				setLang,
				t: translate,
				tFormat: translateWithVars,
				switchLanguage,
				getLocalizedPath,
				supportedLanguages: LANGUAGES
			}}
		>
			{children}
		</LanguageContext.Provider>
	)
}

// Hook for easy access to the language context
export const useLanguage = () => useContext(LanguageContext)

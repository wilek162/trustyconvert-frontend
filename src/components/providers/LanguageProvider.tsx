import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { DEFAULT_LANGUAGE, type Language } from '@/lib/i18n/config'
import { t, tFormat, type TranslationKey } from '@/lib/i18n/translations'

type LanguageContextType = {
	lang: string
	setLang: (lang: string) => void
	t: (key: TranslationKey) => string
	tFormat: (key: TranslationKey, variables: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextType>({
	lang: DEFAULT_LANGUAGE.code,
	setLang: () => {},
	t: (key) => key,
	tFormat: (key) => key
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

	return (
		<LanguageContext.Provider
			value={{
				lang,
				setLang,
				t: translate,
				tFormat: translateWithVars
			}}
		>
			{children}
		</LanguageContext.Provider>
	)
}

// Hook for easy access to the language context
export const useLanguage = () => useContext(LanguageContext)

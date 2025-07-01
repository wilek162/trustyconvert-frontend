import { useEffect, useState } from 'react'
import { t, tFormat, type TranslationKey } from '../translations'
import { DEFAULT_LANGUAGE } from '../config'

/**
 * React hook for using translations in React components
 */
export function useTranslation(initialLang = DEFAULT_LANGUAGE.code) {
	const [lang, setLang] = useState(initialLang)

	// Get language from HTML tag on client side
	useEffect(() => {
		const htmlLang = document.documentElement.lang
		if (htmlLang) {
			setLang(htmlLang)
		}
	}, [])

	return {
		t: (key: TranslationKey) => t(key, lang),
		tFormat: (key: TranslationKey, variables: Record<string, string | number>) =>
			tFormat(key, lang, variables),
		lang
	}
}

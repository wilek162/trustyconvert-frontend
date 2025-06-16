import React from 'react'
import { useLanguage } from '@/components/providers/LanguageProvider'
import type { TranslationKey } from '@/lib/i18n/translations'

interface TranslatedTextProps {
	translationKey: TranslationKey
	variables?: Record<string, string | number>
	as?: keyof JSX.IntrinsicElements
	className?: string
}

/**
 * A component that displays translated text
 *
 * @example
 * ```tsx
 * <TranslatedText translationKey="welcome_message" variables={{ name: "User" }} />
 * <TranslatedText translationKey="page_title" as="h1" className="text-2xl" />
 * ```
 */
export function TranslatedText({
	translationKey,
	variables,
	as: Component = 'span',
	className = '',
	...props
}: TranslatedTextProps & Omit<React.HTMLAttributes<HTMLElement>, 'children'>) {
	const { t, tFormat } = useLanguage()

	const translatedText = variables ? tFormat(translationKey, variables) : t(translationKey)

	return (
		<Component className={className} {...props}>
			{translatedText}
		</Component>
	)
}

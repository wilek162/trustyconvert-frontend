import { useState, useRef, useEffect } from 'react'
import { LANGUAGES, formatLocalizedPath } from '@/lib/i18n/config'
import { useLanguage } from '@/components/providers/LanguageProvider'

interface LanguageSwitcherButtonProps {
	className?: string
}

export function LanguageSwitcherButton({ className = '' }: LanguageSwitcherButtonProps) {
	const [isOpen, setIsOpen] = useState(false)
	const { lang } = useLanguage()
	const dropdownRef = useRef<HTMLDivElement>(null)
	const currentLanguage = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0]

	// Close dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false)
			}
		}

		document.addEventListener('mousedown', handleClickOutside)
		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [])

	// Handle language change
	const handleLanguageChange = (languageCode: string) => {
		// Get current path without language prefix
		const path = window.location.pathname
		const segments = path.split('/').filter(Boolean)

		// Check if the first segment is a language code
		let pathWithoutLang = path
		if (segments.length > 0 && LANGUAGES.some((lang) => lang.code === segments[0])) {
			pathWithoutLang = '/' + segments.slice(1).join('/')
		}

		// If path is empty, use root
		if (pathWithoutLang === '') pathWithoutLang = '/'

		// Navigate to the localized path
		window.location.href = formatLocalizedPath(pathWithoutLang, languageCode)
	}

	return (
		<div className={`relative ${className}`} ref={dropdownRef}>
			<button
				type="button"
				className="flex items-center space-x-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
				onClick={() => setIsOpen(!isOpen)}
				aria-expanded={isOpen}
				aria-haspopup="true"
			>
				<span className="mr-1">{currentLanguage.flag}</span>
				<span className="hidden sm:inline">{currentLanguage.name}</span>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					className="ml-1 h-4 w-4"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			{isOpen && (
				<div
					className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
					role="menu"
					aria-orientation="vertical"
					tabIndex={-1}
				>
					<div className="py-1" role="none">
						{LANGUAGES.map((language) => (
							<button
								key={language.code}
								className={`flex w-full items-center px-4 py-2 text-left text-sm ${
									language.code === lang
										? 'bg-gray-100 font-medium text-gray-900'
										: 'text-gray-700 hover:bg-gray-50'
								}`}
								role="menuitem"
								tabIndex={-1}
								onClick={() => handleLanguageChange(language.code)}
							>
								<span className="mr-2">{language.flag}</span>
								{language.name}
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	)
}

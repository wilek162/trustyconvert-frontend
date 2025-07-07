import React, { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@/components/providers/LanguageProvider'

interface LanguageSwitcherButtonProps {
	className?: string
}

export function LanguageSwitcherButton({ className = '' }: LanguageSwitcherButtonProps) {
	const { lang, supportedLanguages, switchLanguage, t } = useLanguage()
	const [isOpen, setIsOpen] = useState(false)
	const dropdownRef = useRef<HTMLDivElement>(null)
	
	// Get current language object
	const currentLanguage = supportedLanguages.find(l => l.code === lang) || supportedLanguages[0]
	
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
	
	return (
		<div className={`relative ${className}`} ref={dropdownRef}>
			<button
				className="flex items-center space-x-1 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
				onClick={() => setIsOpen(!isOpen)}
				aria-expanded={isOpen}
				aria-haspopup="true"
			>
				<span className="mr-1">{currentLanguage.flag}</span>
				<span className="hidden sm:inline">{currentLanguage.name}</span>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="ml-1 h-4 w-4"
				>
					<polyline points="6 9 12 15 18 9"></polyline>
				</svg>
			</button>
			
			{isOpen && (
				<div
					className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md border border-border bg-background shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
					role="menu"
					aria-orientation="vertical"
					tabIndex={-1}
				>
					<div className="py-1" role="none">
						{supportedLanguages.map((language) => (
							<button
								key={language.code}
								onClick={() => {
									switchLanguage(language.code)
									setIsOpen(false)
								}}
								className={`flex w-full items-center px-4 py-2 text-left text-sm hover:bg-muted ${
									language.code === lang
										? 'bg-muted font-medium text-foreground'
										: 'text-muted-foreground'
								}`}
								role="menuitem"
								tabIndex={-1}
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

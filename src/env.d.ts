/// <reference types="astro/client" />
import type { Language } from './lib/i18n/config'

declare namespace App {
	interface Locals {
		lang: string
		languages: Language[]
		defaultLanguage: Language
		detectedLanguage: string
	}
}

import { defineMiddleware } from 'astro:middleware'
import { createLanguageMiddleware, detectBrowserLanguage } from './lib/i18n/middleware'
import { DEFAULT_LANGUAGE } from './lib/i18n/config'

// Create language middleware
const languageMiddleware = createLanguageMiddleware()

// Check if we're in static mode
const isStaticMode = import.meta.env.OUTPUT === 'static'

// Define middleware
export const onRequest = defineMiddleware(async (context, next) => {
	// Ensure the locals object has the required properties
	if (!context.locals) {
		context.locals = {} as any
	}

	// Set default values for language-related properties
	context.locals.lang = context.locals.lang || DEFAULT_LANGUAGE.code
	context.locals.languages = context.locals.languages || []
	context.locals.defaultLanguage = context.locals.defaultLanguage || DEFAULT_LANGUAGE
	context.locals.detectedLanguage = context.locals.detectedLanguage || DEFAULT_LANGUAGE.code

	// Apply language middleware to add language info to context
	await languageMiddleware(context)

	// Skip browser language detection in static mode
	if (!isStaticMode) {
		// Handle language detection for the root URL
		const { pathname, origin } = context.url
		const { request } = context

		// For the root URL, detect browser language and redirect if needed
		if (pathname === '/' || pathname === '') {
			const acceptLanguage = request.headers.get('accept-language')
			if (acceptLanguage) {
				const detectedLang = detectBrowserLanguage(acceptLanguage)

				// If detected language is not the default and is one we support,
				// redirect to the language-specific URL
				if (detectedLang !== DEFAULT_LANGUAGE.code) {
					// Store the detected language in a cookie for future visits
					context.cookies.set('preferred_language', detectedLang, {
						path: '/',
						maxAge: 60 * 60 * 24 * 365 // 1 year
					})

					// Only redirect if this is not an API request
					if (!pathname.startsWith('/api/')) {
						return context.redirect(`/${detectedLang}${pathname === '/' ? '' : pathname}`)
					}
				}
			}
		}
	}

	// Continue to the next middleware or route handler
	return next()
})

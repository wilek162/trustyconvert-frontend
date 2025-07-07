# Multilingual Implementation Guide for TrustyConvert

This document outlines the multilingual (i18n) implementation for the TrustyConvert frontend. It provides guidelines and best practices for maintaining and extending the multilingual capabilities of the application.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Directory Structure](#directory-structure)
3. [Adding New Translations](#adding-new-translations)
4. [Using Translations in Components](#using-translations-in-components)
5. [Language Routing](#language-routing)
6. [SEO Considerations](#seo-considerations)
7. [Best Practices](#best-practices)

## Architecture Overview

The multilingual implementation follows these key principles:

- **Separation of Concerns**: Translation logic is separated from UI components
- **Static Generation**: All language variants are pre-rendered at build time
- **SEO Optimization**: Each language has its own URL structure and proper meta tags
- **Fallbacks**: Missing translations fall back to English
- **Client-side Language Detection**: For better UX when a user first visits the site

The implementation uses:
- Language-specific routes (`/en/`, `/es/`, etc.)
- Translation files for each supported language
- React context for client-side components
- Astro components for server-rendered content

## Directory Structure

```
src/
├── lib/
│   └── i18n/
│       ├── config.ts           # Language configuration
│       ├── hooks/              # React hooks for i18n
│       │   └── useTranslation.ts
│       ├── index.ts            # Centralized exports
│       ├── middleware.ts       # Astro middleware for i18n
│       ├── translations/       # Translation files
│       │   ├── en.ts           # English (default)
│       │   ├── es.ts           # Spanish
│       │   ├── fr.ts           # French
│       │   ├── de.ts           # German
│       │   ├── zh.ts           # Chinese
│       │   └── index.ts        # Translation utilities
│       └── utils.ts            # Utility functions
├── components/
│   └── common/
│       ├── LanguageSelector.astro     # Language dropdown for Astro
│       ├── LanguageSwitcherButton.tsx # Language dropdown for React
│       ├── TranslatedLink.astro       # Link with translation
│       └── TranslatedText.astro       # Text with translation
└── pages/
    ├── [lang]/                # Language-specific routes
    │   ├── index.astro        # Home page
    │   ├── about.astro        # About page
    │   └── ...                # Other pages
    └── index.astro            # Default language route
```

## Adding New Translations

To add a new language:

1. Add the language to `LANGUAGES` array in `src/lib/i18n/config.ts`:

```typescript
export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸', locale: 'en-US', isDefault: true },
  // Add your new language here
  { code: 'ja', name: '日本語', flag: '🇯🇵', locale: 'ja-JP' }
]
```

2. Create a new translation file in `src/lib/i18n/translations/`:

```typescript
// src/lib/i18n/translations/ja.ts
const translations = {
  site_name: 'TrustyConvert',
  // Add all translations here
}

export default translations
```

3. Import and add the new language to `src/lib/i18n/translations/index.ts`:

```typescript
import ja from './ja'

export const translations = {
  en,
  es,
  fr,
  de,
  zh,
  ja // Add your new language
}
```

## Using Translations in Components

### In Astro Components

Use the `TranslatedText` component or the `t` function:

```astro
---
import TranslatedText from '@/components/common/TranslatedText.astro'
import { t } from '@/lib/i18n/translations'

const currentLang = Astro.locals.lang || 'en'
---

<!-- Option 1: Using the component -->
<h1><TranslatedText translationKey="page_title" /></h1>

<!-- Option 2: Using the t function directly -->
<h1>{t('page_title', currentLang)}</h1>

<!-- With variables -->
<p>
  <TranslatedText 
    translationKey="welcome_message" 
    variables={{ name: "User" }} 
  />
</p>
```

### In React Components

Use the `useLanguage` hook:

```tsx
import { useLanguage } from '@/components/providers/LanguageProvider'
import { TranslatedText } from '@/components/ui/TranslatedText'

export function MyComponent() {
  const { t, tFormat } = useLanguage()
  
  return (
    <div>
      {/* Option 1: Using the component */}
      <TranslatedText translationKey="welcome_message" variables={{ name: "User" }} />
      
      {/* Option 2: Using the hook directly */}
      <h1>{t('page_title')}</h1>
      <p>{tFormat('welcome_message', { name: 'User' })}</p>
    </div>
  )
}
```

## Language Routing

The application uses a dynamic route parameter `[lang]` to handle language-specific routes. The default language (English) is served from the root URL, while other languages have their own prefixes.

For example:
- `/` - English (default)
- `/es/` - Spanish
- `/fr/` - French

To create a new page with language support:

1. Create the page in the `[lang]` directory:

```astro
---
// src/pages/[lang]/my-page.astro
import MultilingualLayout from '@/layouts/MultilingualLayout.astro'
import { generateLanguagePaths } from '@/lib/i18n/utils'

export function getStaticPaths() {
  return generateLanguagePaths()
}

const { lang } = Astro.params
---

<MultilingualLayout lang={lang as string}>
  <!-- Your page content -->
</MultilingualLayout>
```

2. Use the `TranslatedLink` component for internal navigation:

```astro
<TranslatedLink href="/my-page" textKey="nav_my_page" />
```

## SEO Considerations

The implementation includes several SEO optimizations:

1. **Alternate Language Links**: Each page includes `<link rel="alternate" hreflang="...">` tags for all supported languages.

2. **Canonical URLs**: Each page has a canonical URL to avoid duplicate content issues.

3. **Language-specific Meta Tags**: Title, description, and Open Graph tags are translated for each language.

4. **Structured Data**: JSON-LD structured data is included and can be language-specific.

## Best Practices

1. **Always use translation keys**: Never hardcode text directly in components.

2. **Keep translation files organized**: Group related translations together with comments.

3. **Use descriptive translation keys**: Keys should be clear and organized by feature or page.

4. **Provide context for translators**: Add comments for ambiguous phrases.

5. **Handle pluralization**: Use variables for pluralization rules.

6. **Test all languages**: Verify that layouts work with longer text in other languages.

7. **Keep translations up to date**: When adding new features, update all language files.

8. **Use fallbacks**: Always provide a fallback for missing translations.

9. **Consider RTL languages**: If adding RTL languages like Arabic, ensure the UI supports it.

10. **Optimize bundle size**: Load only the translations needed for the current language. 
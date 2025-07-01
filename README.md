# TrustyConvert Frontend

A modern, secure, and fast file conversion web application built with Astro, React, and TailwindCSS.

## Features

- 🔒 Secure file conversions with client-side encryption and zero storage
- ⚡ Ultra-fast conversions with efficient processing
- 🎨 Clean, responsive UI following TrustyConvert brand guidelines
- 📱 Mobile-first design that works across all devices
- 🔄 Support for multiple file formats
- 🛡️ Comprehensive security measures including CSRF protection and secure sessions

## Tech Stack

- **Framework**: [Astro](https://astro.build/) with [React](https://reactjs.org/) islands
- **UI**: [TailwindCSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/)
- **State Management**: [Nanostores](https://github.com/nanostores/nanostores) for lightweight global state
- **Data Fetching**: [TanStack Query](https://tanstack.com/query) (React Query v5)
- **File Handling**: [react-dropzone](https://react-dropzone.js.org/) for file uploads
- **Persistence**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (via idb) for local storage
- **Testing**: [Vitest](https://vitest.dev/) and [Testing Library](https://testing-library.com/)

## Project Structure

The codebase follows a feature-based organization pattern:

```
src/
├── components/     # UI components
│   ├── common/     # Common UI components
│   ├── features/   # Feature-specific components
│   │   ├── conversion/   # Conversion-related components
│   │   ├── session/      # Session management components
│   │   ├── upload/       # File upload components
│   │   └── history/      # Job history components
│   ├── layout/     # Layout components
│   ├── providers/  # Context providers
│   └── ui/         # shadcn/ui components
├── layouts/        # Astro layout templates
├── lib/           # Core utilities and functionality
│   ├── api/       # API client
│   ├── config/    # Configuration and constants
│   ├── hooks/     # React hooks
│   ├── stores/    # State management stores
│   ├── types/     # TypeScript type definitions
│   └── utils/     # Utility functions
├── pages/         # Astro page routes
├── styles/        # Global styles
└── test/          # Test utilities and setup
```

## Getting Started

### Prerequisites

- Node.js (v18+)
- pnpm (v8+)

### Installation

1. Clone the repository
```bash
git clone https://github.com/your-org/trustyconvert-frontend.git
cd trustyconvert-frontend
```

2. Install dependencies
```bash
pnpm install
```

3. Start the development server
```bash
pnpm dev
```

4. Open [http://localhost:4322](http://localhost:4322) to view the app

## Build

```bash
pnpm build
```

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# UI mode
pnpm test:ui

# Coverage
pnpm test:coverage
```

## Security Measures

- Client-side encryption of sensitive data
- Secure CSRF token validation for all API requests
- Session-based authentication with secure cookies
- File validation to prevent malicious uploads
- XSS protection with proper output encoding

## Code Quality

- ESLint and Prettier for code formatting
- TypeScript for type safety
- Husky for pre-commit hooks
- Comprehensive unit and integration tests

## License

This project is licensed under the [MIT License](LICENSE).

## 📧 Contact

For questions or feedback, please contact us at support@trustyconvert.com.

## Multilingual Support

TrustyConvert now supports multiple languages to improve SEO and accessibility. The implementation follows these principles:

### Key Features

- **URL Structure**: Language-specific URLs (e.g., `/es/about`, `/fr/blog/article-name`)
- **Default Language**: English is the default language and uses URLs without a language prefix
- **SEO Optimization**: Proper `hreflang` tags, localized metadata, and structured data
- **Content Translation**: Separate translation files for UI elements and content
- **Language Detection**: Automatic language detection based on browser preferences
- **Language Switching**: Easy language selector component

### Directory Structure

```
src/
├── lib/
│   └── i18n/
│       ├── config.ts             # Language configuration
│       ├── middleware.ts         # Language detection middleware
│       ├── utils.ts              # i18n utility functions
│       ├── hooks/                # React hooks for i18n
│       └── translations/         # Translation files
│           ├── index.ts          # Translation utilities
│           ├── en.ts             # English translations
│           ├── es.ts             # Spanish translations
│           ├── fr.ts             # French translations
│           ├── de.ts             # German translations
│           └── zh.ts             # Chinese translations
├── pages/
│   ├── [lang]/                   # Localized routes
│   │   ├── index.astro           # Localized home page
│   │   ├── blog/                 # Localized blog routes
│   │   └── ...                   # Other localized routes
│   └── ...                       # Default language routes
└── components/
    └── common/
        └── LanguageSelector.astro # Language selector component
```

### Usage

#### Adding a New Language

1. Add the language to `src/lib/i18n/config.ts`
2. Create a translation file in `src/lib/i18n/translations/`
3. Update content as needed

#### Translating UI Elements

Use the translation functions in your components:

```astro
---
import { t } from '@/lib/i18n/translations'
const currentLang = Astro.locals.lang
---

<h1>{t('home_hero_title', currentLang)}</h1>
```

For React components:

```jsx
import { useTranslation } from '@/lib/i18n/hooks/useTranslation'

export function MyComponent() {
  const { t } = useTranslation()
  
  return <h1>{t('home_hero_title')}</h1>
}
```

#### Creating Localized Routes

Create files in the `src/pages/[lang]/` directory for localized versions of your pages.

```sh
pnpm create astro@latest -- --template with-tailwindcss
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/astro/tree/latest/examples/with-tailwindcss)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/astro/tree/latest/examples/with-tailwindcss)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/withastro/astro?devcontainer_path=.devcontainer/with-tailwindcss/devcontainer.json)

Astro comes with [Tailwind](https://tailwindcss.com) support out of the box. This example showcases how to style your Astro project with Tailwind.

For complete setup instructions, please see our [Tailwind Integration Guide](https://docs.astro.build/en/guides/integrations-guide/tailwind).

## API Integration

The frontend integrates with the TrustyConvert backend API for file conversion. The integration includes:

- Session management with CSRF protection
- File upload and conversion
- Job status polling
- Secure file download

For detailed information, see:
- [API Integration Guide](docs/API_INTEGRATION.md)
- [API Integration Guide (Frontend)](API_INTEGRATION_GUIDE.md)

### Testing the API Connection

To test the API connection:

```bash
# Run the test script
./test-api.sh

# Or manually
node test-api-connection.js
```

This will test the full API flow: session initialization, file upload, conversion, status polling, and download token generation.

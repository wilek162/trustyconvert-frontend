# TrustyConvert Frontend

A fast, secure file conversion platform built with Astro, React, and TypeScript.

## 🚀 Features

- **Fast & Secure**: Lightning-fast file conversions with enterprise-grade security
- **Modern Tech Stack**: Astro v5.9.1, React, TypeScript, and Tailwind CSS
- **Minimal Client JS**: Static output mode with React islands only where needed
- **Type-Safe API Integration**: Fully typed API client with CSRF protection
- **Mobile-First Design**: Responsive UI that works on all devices

## 🛠️ Tech Stack

- **Framework**: [Astro](https://astro.build/) v5.9.1 (static output mode)
- **UI Components**: [React](https://reactjs.org/) (minimal islands)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/)
- **State Management**: [nanostores](https://github.com/nanostores/nanostores)
- **API Integration**: [@tanstack/react-query](https://tanstack.com/query)
- **Type Safety**: [TypeScript](https://www.typescriptlang.org/)

## 📁 Project Structure

```
/
├── public/           # Static assets
├── src/
│   ├── components/   # UI components
│   │   ├── features/ # Feature-specific components
│   │   ├── ui/       # Reusable UI components
│   │   ├── layout/   # Layout components
│   │   ├── common/   # Common components
│   │   ├── providers/ # Context providers
│   │   └── seo/      # SEO components
│   ├── layouts/      # Page layouts
│   ├── lib/          # Utility functions
│   │   ├── api/      # API client
│   │   ├── stores/   # Nanostores
│   │   ├── types/    # TypeScript types
│   │   └── utils/    # Utility functions
│   ├── pages/        # Astro pages
│   └── styles/       # Global styles
└── astro.config.mjs  # Astro configuration
```

## 🧞 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) (v8 or higher)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/trustyconvert-frontend.git
cd trustyconvert-frontend

# Install dependencies
pnpm install
```

### Development

```bash
# Start the development server
pnpm dev
```

This will start the development server at `http://localhost:4322`.

### Building for Production

```bash
# Build the project
pnpm build

# Preview the production build
pnpm preview
```

## 🔒 Security Features

- CSRF protection on all forms
- In-memory only storage of tokens (no localStorage)
- Secure, HttpOnly session cookies
- Automatic session cleanup

## 📝 License

This project is licensed under the [MIT License](LICENSE).

## 📧 Contact

For questions or feedback, please contact us at support@trustyconvert.com.

```sh
pnpm create astro@latest -- --template with-tailwindcss
```

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/withastro/astro/tree/latest/examples/with-tailwindcss)
[![Open with CodeSandbox](https://assets.codesandbox.io/github/button-edit-lime.svg)](https://codesandbox.io/p/sandbox/github/withastro/astro/tree/latest/examples/with-tailwindcss)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/withastro/astro?devcontainer_path=.devcontainer/with-tailwindcss/devcontainer.json)

Astro comes with [Tailwind](https://tailwindcss.com) support out of the box. This example showcases how to style your Astro project with Tailwind.

For complete setup instructions, please see our [Tailwind Integration Guide](https://docs.astro.build/en/guides/integrations-guide/tailwind).

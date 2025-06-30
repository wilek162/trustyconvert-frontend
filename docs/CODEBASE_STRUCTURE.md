# TrustyConvert Frontend Codebase Structure

This document outlines the architecture, structure, and guidelines for the TrustyConvert frontend application, a static Astro site with React components for client-side interactivity.

## Project Overview

TrustyConvert is a file conversion service that allows users to convert files between different formats. The frontend is built using:

- **Astro**: For static site generation and page routing
- **React**: For client-side interactive components
- **TypeScript**: For type safety across the codebase
- **Tailwind CSS**: For styling
- **Nanostores**: For state management

## Directory Structure

```
trustyconvert-frontend/
├── src/                    # Source code
│   ├── components/         # UI components
│   │   ├── common/         # Shared components
│   │   ├── features/       # Feature-specific components
│   │   ├── layout/         # Layout components
│   │   ├── providers/      # Context providers
│   │   ├── seo/            # SEO-related components
│   │   └── ui/             # UI library components
│   ├── content/            # Content collections (blog posts, etc.)
│   ├── layouts/            # Page layouts
│   ├── lib/                # Core functionality
│   │   ├── api/            # API client and related utilities
│   │   ├── config/         # Configuration
│   │   ├── errors/         # Error handling
│   │   ├── hooks/          # Custom React hooks
│   │   ├── i18n/           # Internationalization
│   │   ├── monitoring/     # Error tracking and monitoring
│   │   ├── services/       # Service modules
│   │   ├── stores/         # State management
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   ├── middleware/         # Astro middleware
│   ├── pages/              # Page routes
│   └── styles/             # Global styles
├── public/                 # Static assets
├── docs/                   # Documentation
└── certs/                  # SSL certificates for local development
```

## Core Modules

### API Client (`src/lib/api/`)

The API client is responsible for communication with the backend API. It provides:

- Type-safe API endpoints
- Error handling and retry logic
- CSRF protection
- Session management

Key files:
- `_apiClient.ts`: Core API client implementation (not to be used directly)
- `client.ts`: Public API client interface
- `config.ts`: API configuration
- `types.ts`: API-related types

### State Management (`src/lib/stores/`)

State is managed using Nanostores, providing:

- Reactive state management
- Persistent storage with IndexedDB
- Type-safe state access

Key stores:
- `upload.ts`: Manages file upload state
- `conversion.ts`: Manages conversion state
- `session.ts`: Manages session state

### Services (`src/lib/services/`)

Services encapsulate business logic:

- `downloadService.ts`: Handles file downloads
- `jobPollingService.ts`: Polls for job status updates
- `sessionManager.ts`: Manages user sessions

### Components

Components are organized by their purpose:

- **Common Components**: Reusable components used across the application
- **Feature Components**: Components specific to a feature (e.g., conversion, upload)
- **UI Components**: Base UI components (buttons, inputs, etc.)
- **Layout Components**: Page layout components
- **Provider Components**: Context providers for React

## Key Patterns and Guidelines

### API Communication

1. Always use the `client.ts` API client for backend communication, never the `_apiClient.ts` directly
2. Handle errors appropriately using the error utilities in `lib/errors/`
3. Use retry logic for network operations that might fail

### State Management

1. Use Nanostores for state that needs to be shared across components
2. Keep state normalized and minimal
3. Use IndexedDB for persistent storage of important data

### Component Design

1. Prefer small, focused components with clear responsibilities
2. Use TypeScript interfaces for component props
3. Keep UI logic separate from business logic
4. Use client:* directives appropriately in Astro templates

### Error Handling

1. Use structured error types from `lib/errors/`
2. Log errors to the error tracking system
3. Provide user-friendly error messages
4. Implement retry logic for transient errors

### Internationalization

1. Use the i18n utilities for all user-facing text
2. Support language switching via the URL parameter
3. Ensure all text is translatable

### Performance

1. Minimize client-side JavaScript
2. Use appropriate Astro partial hydration strategies
3. Optimize images and assets
4. Implement lazy loading where appropriate

## Build and Development

- Development: `pnpm dev`
- Build: `pnpm build`
- Preview: `pnpm preview`

## Common Issues and Solutions

### CSRF Token Issues

If you encounter CSRF validation errors:
1. Check that the session is properly initialized
2. Ensure CSRF tokens are being sent with requests
3. Verify that cookies are being properly stored

### API Connection Issues

If API requests are failing:
1. Check the API URL configuration
2. Verify CORS settings
3. Check SSL certificate configuration for local development

## Adding New Features

When adding new features:

1. Create components in the appropriate directory
2. Add any necessary API endpoints to the client
3. Create or update state stores as needed
4. Add appropriate error handling
5. Update documentation

## Testing

- Unit tests: Use Vitest for component and utility testing
- Component tests: Use Storybook for visual testing
- End-to-end tests: Use Playwright for full workflow testing

## Deployment

The application is built as a static site and can be deployed to any static hosting service. The build process:

1. Generates static HTML pages
2. Bundles JavaScript for client-side interactivity
3. Optimizes assets
4. Generates a sitemap

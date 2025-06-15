# TrustyConvert Frontend Source Code

This directory contains the source code for the TrustyConvert frontend application. The application is built using Astro with React components for interactive elements.

## Directory Structure

```
src/
├── components/       # UI components
│   ├── common/       # Common UI components
│   ├── features/     # Feature components (business logic)
│   ├── layout/       # Layout components
│   ├── providers/    # Context providers
│   ├── seo/          # SEO components
│   └── ui/           # UI components from shadcn/ui
│
├── layouts/          # Astro layout templates
│
├── lib/              # Utilities and core functionality
│   ├── api/          # API client and related utilities
│   ├── config/       # Configuration and constants
│   ├── hooks/        # React hooks
│   ├── stores/       # State management
│   ├── types/        # TypeScript type definitions
│   └── utils/        # Utility functions
│
├── pages/            # Astro pages
│
├── middleware/       # Middleware functions
│
├── mocks/            # Mock data and API mocks for development
│
└── styles/           # Global styles and Tailwind CSS configuration
```

## Key Concepts

### Component Organization

- **Common Components**: Reusable UI components without business logic
- **Feature Components**: Components that encapsulate specific business logic
- **Layout Components**: Page layout components used by Astro
- **UI Components**: Shadcn UI components and customizations

### State Management

- **Stores**: Uses nanostores for global state management
  - `session.ts`: Session and authentication state
  - `conversion.ts`: Conversion process state
  - `upload.ts`: File upload state with IndexedDB persistence

### API Integration

- **API Client**: Type-safe API client with error handling
- **API Hooks**: React Query hooks for data fetching and mutations

### Utilities

- Centralized utility functions in `lib/utils/` directory
- Configuration constants in `lib/config/constants.ts`

## Best Practices

1. **Component Isolation**: Keep components focused with clear responsibilities
2. **Type Safety**: Use TypeScript types for all component props and API responses
3. **Error Handling**: Use centralized error handling for consistency
4. **Code Splitting**: Utilize Astro's built-in code splitting
5. **State Management**: Use nanostores for global state, React Query for server state

## Environment Variables

See `.env.example` file for required environment variables.

## Further Documentation

- Security implementation details: See `docs/security.md`
- API integration guide: See `docs/api-integration.md`
- Component styling guide: See `trustyconvert docs/trustyconvert_brand_guide.md` 
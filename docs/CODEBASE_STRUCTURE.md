# TrustyConvert Frontend Codebase Structure

This document outlines the structure and organization of the TrustyConvert frontend codebase. It provides guidelines for maintaining and extending the application in accordance with clean code principles.

## Directory Structure

The codebase is organized according to feature and responsibility:

```
src/
├── components/        # React components
│   ├── common/        # Reusable UI components
│   ├── features/      # Feature-specific components
│   ├── layouts/       # Layout components
│   └── providers/     # React context providers
├── lib/               # Core application logic
│   ├── api/           # API client and types
│   ├── monitoring/    # Error tracking and performance monitoring
│   ├── stores/        # State management
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Utility functions
├── mocks/             # Mock API for development
├── pages/             # Astro pages
├── layouts/           # Astro layouts
└── styles/            # Global styles and Tailwind configuration
```

## Core Principles

### 1. Single Responsibility

Each file should have a clear, single responsibility. Avoid creating large files that handle multiple concerns. For example:

- API clients should only handle API communication
- Components should focus on rendering and user interaction
- Utility functions should be grouped by domain

### 2. Proper Error Handling

All async operations should use proper error handling, utilizing our centralized error utilities:

```typescript
import { handleError } from '@/lib/utils'

try {
	const data = await fetchData()
	return data
} catch (error) {
	handleError(error, { context: { action: 'fetchData' } })
	throw error
}
```

### 3. Type Safety

Always define proper TypeScript interfaces for:

- Component props
- API responses
- State objects
- Function parameters and return types

### 4. Documentation

All modules, functions, and complex logic should include JSDoc comments that explain:

- What the code does
- Parameters and return values
- Important implementation details
- Any potential side effects

### 5. Testability

Code should be written with testability in mind:

- Avoid tight coupling between components
- Use dependency injection where appropriate
- Keep functions pure when possible
- Separate business logic from UI

## Key Modules

### API Client (`src/lib/api/apiClient.ts`)

The API client provides a centralized interface for all backend communication. It handles:

- Authentication and CSRF tokens
- Request retries and timeouts
- Error categorization and handling
- Response parsing and typing

### Monitoring (`src/lib/monitoring/`)

The monitoring system provides error tracking and performance monitoring:

- Centralized error reporting via `reportError`
- Performance metrics collection via `measurePerformance`
- Abstraction layer for different environments (dev/prod)

### Error Handling (`src/lib/utils/errorHandling.ts`)

Provides utilities for consistent error handling:

- Error classes for different error types
- Centralized error handling with proper logging
- User-friendly error messages

### Mock API (`src/mocks/`)

Implements a mock API server for development:

- Simulates all backend endpoints
- Provides realistic response patterns including errors
- Manages mock data for testing scenarios

## Best Practices

### Adding New Features

1. Define the feature requirements and API contract
2. Create necessary type definitions
3. Implement the core logic in appropriate lib modules
4. Create UI components
5. Add tests
6. Update documentation

### Error Handling

All asynchronous operations should handle errors properly:

1. Use try/catch blocks around async code
2. Use the `handleError` utility for consistent error reporting
3. Provide user-friendly fallbacks in the UI
4. Use typed error classes for different error categories

### Performance Considerations

1. Minimize bundle size by avoiding large dependencies
2. Use lazy loading for non-critical components
3. Optimize API calls (caching, deduplication)
4. Monitor performance metrics in production

### Security Considerations

1. Always validate user input
2. Use CSRF protection for all API calls
3. Never store sensitive information in localStorage
4. Follow secure coding practices

## Development Workflow

1. Run the development server with `pnpm dev`
2. Use MSW for API mocking during development
3. Lint code with `pnpm lint`
4. Format code with `pnpm format`
5. Typecheck with `pnpm typecheck`
6. Build with `pnpm build`

## Conclusion

By following these guidelines, we ensure that the TrustyConvert codebase remains clean, maintainable, and scalable. Each part of the application should have a clear responsibility and be easy to understand and modify.

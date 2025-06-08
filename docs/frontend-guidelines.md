# Frontend Development Guidelines

## Table of Contents

1. [User Flow](#user-flow)
2. [Component Architecture](#component-architecture)
3. [Styling Guidelines](#styling-guidelines)
4. [Project Rules](#project-rules)
5. [Error Handling](#error-handling)
6. [Performance Considerations](#performance-considerations)

## User Flow

### 1. Landing Page

- Clean, minimalist design with clear call-to-action
- Prominent file upload area in the center
- Quick access to supported formats
- Clear indication of free service and security

### 2. File Upload Process

1. **Initial State**

   - Drag & drop zone with visual feedback
   - File type icons based on MIME type
   - Clear supported formats list
   - Size limits displayed

2. **Upload State**

   - Progress indicator with percentage
   - Cancel option
   - Clear error handling
   - Visual feedback for upload status

3. **Format Selection**

   - Dynamic format options based on input file
   - Clear format descriptions
   - Visual preview if possible

4. **Conversion Process**

   - Progress tracking
   - Status updates
   - Estimated time remaining
   - Error handling with retry options

5. **Download State**
   - Clear success indication
   - Prominent download button
   - Option to convert another file
   - Share options (if implemented)

## Component Architecture

### 1. Component Types

#### Astro Components/Layouts (`*.astro`)

- Use for static UI elements
- Server-side rendered content
- SEO-critical components
- Layout components

Examples:

- `Layout.astro`
- `Header.astro`
- `Footer.astro`
- `SEO.astro`

#### React Components (`*.tsx`)

- Use for interactive elements
- State management
- User input handling
- Dynamic UI updates

Examples:

- `FileUpload.tsx`
- `ConversionProgress.tsx`
- `FormatSelector.tsx`
- `Toast.tsx`

### 2. Component Organization

```
src/
  components/
    common/          # Shared components
    features/        # Feature-specific components
    layout/         # Layout components
    ui/             # UI components library
    providers/      # Context providers
    seo/            # SEO components
```

## Styling Guidelines

### 1. Design Tokens

```css
:root {
  /* Colors */
  --color-primary: #0066cc;
  --color-secondary: #4c566a;
  --color-success: #4caf50;
  --color-warning: #ff9800;
  --color-error: #f44336;

  /* Typography */
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 1rem;
  --space-4: 1.5rem;
  --space-5: 2rem;

  /* Transitions */
  --transition-default: 200ms ease-in-out;
  --transition-slow: 300ms ease-in-out;
}
```

### 2. Component Styling Rules

- Use Tailwind CSS for component styling
- Follow mobile-first approach
- Use CSS variables for theming
- Maintain dark mode support
- Use semantic class names

### 3. Responsive Design

- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

## Project Rules

### 1. File Naming

- Components: PascalCase (e.g., `FileUpload.tsx`)
- Utilities: camelCase (e.g., `formatSize.ts`)
- Constants: UPPER_SNAKE_CASE
- CSS Modules: kebab-case

### 2. Import Order

1. React/Framework imports
2. Third-party libraries
3. Local components
4. Hooks
5. Utils/Helpers
6. Types/Interfaces
7. Styles

### 3. Component Structure

```typescript
// Imports
import React from 'react';
import { useFileUpload } from '@/hooks/useFileUpload';

// Types
interface Props {
  // ...
}

// Component
export function ComponentName({ prop1, prop2 }: Props) {
  // Hooks
  const { data, loading } = useFileUpload();

  // Handlers
  const handleClick = () => {
    // ...
  };

  // Render
  return (
    // JSX
  );
}
```

## Error Handling

### 1. Error Types

- API Errors
- Validation Errors
- Network Errors
- Conversion Errors

### 2. Error Display

- Use Toast for transient errors
- Use Alert for form validation
- Use ErrorBoundary for component errors
- Provide clear error messages and recovery actions

### 3. Error Recovery

- Retry mechanisms for network errors
- Clear validation feedback
- Graceful fallbacks
- User-friendly error messages

## Performance Considerations

### 1. Code Splitting

- Route-based splitting
- Component lazy loading
- Dynamic imports for heavy features

### 2. Asset Optimization

- Image optimization
- Font loading strategy
- Icon system (use SVG)
- Lazy loading media

### 3. State Management

- Use React Query for server state
- Use Context for global UI state
- Use local state for component-specific state
- Implement proper cleanup

### 4. Monitoring

- Error tracking
- Performance metrics
- User behavior analytics
- Conversion success rates

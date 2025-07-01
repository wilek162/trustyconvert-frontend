# Component Guidelines for TrustyConvert

This document outlines the guidelines and best practices for creating and using components in the TrustyConvert frontend application.

## Component Organization

Components are organized into several categories based on their purpose and scope:

### 1. UI Components (`src/components/ui/`)

Base UI components that implement the design system. These are the building blocks for all other components.

- Button
- Input
- Card
- Modal
- Alert
- etc.

### 2. Common Components (`src/components/common/`)

Reusable components that are used across multiple features but are specific to our application.

- ErrorBoundary
- LoadingSpinner
- Pagination
- etc.

### 3. Feature Components (`src/components/features/`)

Components that implement specific features of the application. These are organized by feature domain.

- `features/conversion/`: Components related to file conversion
- `features/upload/`: Components related to file upload
- `features/session/`: Components related to session management
- etc.

### 4. Layout Components (`src/components/layout/`)

Components that define the layout structure of pages.

- Header
- Footer
- Sidebar
- etc.

### 5. Provider Components (`src/components/providers/`)

Components that provide context or state to the application.

- AppProviders
- LanguageProvider
- ThemeProvider
- etc.

### 6. SEO Components (`src/components/seo/`)

Components that handle SEO-related functionality.

- SEO
- SEOManager
- etc.

## Component Design Principles

### 1. Single Responsibility

Each component should have a single responsibility. If a component is doing too many things, consider breaking it down into smaller components.

```tsx
// Good: Single responsibility
function FileUploadButton({ onUpload }) {
  return <Button onClick={onUpload}>Upload File</Button>;
}

// Bad: Too many responsibilities
function FileUploadSection({ onUpload, files, onDelete }) {
  // Handles upload, displays files, handles deletion, etc.
}
```

### 2. Props Interface

All component props should be defined using TypeScript interfaces. Use descriptive names and add JSDoc comments for clarity.

```tsx
/**
 * Props for the ConversionOptions component
 */
interface ConversionOptionsProps {
  /** Available source formats */
  sourceFormats: string[];
  /** Available target formats */
  targetFormats: string[];
  /** Currently selected source format */
  selectedSource: string;
  /** Currently selected target format */
  selectedTarget: string;
  /** Called when source format changes */
  onSourceChange: (format: string) => void;
  /** Called when target format changes */
  onTargetChange: (format: string) => void;
}

export function ConversionOptions(props: ConversionOptionsProps) {
  // Component implementation
}
```

### 3. Astro vs React Components

- **Astro Components**: Use for static content that doesn't need interactivity
- **React Components**: Use for interactive elements that need client-side JavaScript

When using React components in Astro pages, use the appropriate client directive:

```astro
---
import { ConversionFlow } from '@/components/features/conversion';
---

<!-- Load the component only when it becomes visible -->
<ConversionFlow client:visible />

<!-- Load the component immediately on page load -->
<ConversionFlow client:load />

<!-- Load the component only on user interaction -->
<ConversionFlow client:idle />
```

### 4. Component Structure

Follow a consistent structure for component files:

```tsx
// 1. Imports
import { useState } from 'react';
import { Button } from '@/components/ui/button';

// 2. Types/Interfaces
interface MyComponentProps {
  // ...
}

// 3. Helper functions (if needed)
function formatData(data: any) {
  // ...
}

// 4. Component definition
export function MyComponent({ prop1, prop2 }: MyComponentProps) {
  // 5. Hooks
  const [state, setState] = useState();
  
  // 6. Event handlers
  const handleClick = () => {
    // ...
  };
  
  // 7. Render
  return (
    <div>
      {/* Component JSX */}
    </div>
  );
}
```

### 5. Error Handling

Components should handle errors gracefully. Use error boundaries for React components and provide fallback UI.

```tsx
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export function MyFeature() {
  return (
    <ErrorBoundary fallback={<p>Something went wrong</p>}>
      <ComplexComponent />
    </ErrorBoundary>
  );
}
```

### 6. Loading States

Components that depend on asynchronous data should handle loading states.

```tsx
function ConversionStatus({ jobId }) {
  const { data, isLoading, error } = useConversionStatus(jobId);
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;
  
  return <StatusDisplay data={data} />;
}
```

### 7. Internationalization

All user-facing text should use the translation utilities.

```tsx
import { useTranslation } from '@/lib/i18n/hooks/useTranslation';

function WelcomeMessage() {
  const { t } = useTranslation();
  
  return <h1>{t('welcome.message')}</h1>;
}
```

## Styling Guidelines

### 1. Use Tailwind CSS for styling

```tsx
// Good
function Button({ children }) {
  return (
    <button className="px-4 py-2 bg-trustTeal text-white rounded hover:bg-trustTeal-dark">
      {children}
    </button>
  );
}

// Avoid direct CSS unless necessary
```

### 2. Use Design Tokens

Reference design tokens for colors, spacing, etc. instead of hardcoding values.

```tsx
// Good
<div className="text-deepNavy bg-card border-border" />

// Avoid
<div className="text-[#123456] bg-[#f8f8f8] border-[#e0e0e0]" />
```

### 3. Responsive Design

Ensure components work well on all screen sizes using Tailwind's responsive utilities.

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Content */}
</div>
```

## Testing Components

### 1. Unit Tests

Write unit tests for complex logic within components.

```tsx
import { render, screen } from '@testing-library/react';
import { ConversionOptions } from './ConversionOptions';

test('renders all format options', () => {
  render(<ConversionOptions sourceFormats={['pdf', 'docx']} targetFormats={['jpg', 'png']} />);
  
  expect(screen.getByText('PDF')).toBeInTheDocument();
  expect(screen.getByText('DOCX')).toBeInTheDocument();
  expect(screen.getByText('JPG')).toBeInTheDocument();
  expect(screen.getByText('PNG')).toBeInTheDocument();
});
```

### 2. Component Stories

Create Storybook stories for visual testing and documentation.

```tsx
// Button.stories.tsx
import { Button } from './Button';

export default {
  title: 'UI/Button',
  component: Button
};

export const Primary = () => <Button variant="primary">Primary Button</Button>;
export const Secondary = () => <Button variant="secondary">Secondary Button</Button>;
export const Disabled = () => <Button disabled>Disabled Button</Button>;
```

## Performance Considerations

### 1. Memoization

Use React.memo for components that render often but with the same props.

```tsx
import { memo } from 'react';

interface ItemProps {
  id: string;
  name: string;
}

export const Item = memo(function Item({ id, name }: ItemProps) {
  return <div>{name}</div>;
});
```

### 2. Virtualization

Use virtualization for long lists to improve performance.

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function FileList({ files }) {
  const virtualizer = useVirtualizer({
    count: files.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });
  
  return (
    <div ref={parentRef} style={{ height: '500px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {files[virtualItem.index].name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 3. Lazy Loading

Use lazy loading for components that aren't needed immediately.

```tsx
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function MyComponent() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

## Accessibility

### 1. Semantic HTML

Use semantic HTML elements whenever possible.

```tsx
// Good
<button onClick={handleClick}>Click me</button>

// Avoid
<div onClick={handleClick} role="button" tabIndex={0}>Click me</div>
```

### 2. ARIA Attributes

Use ARIA attributes when necessary to improve accessibility.

```tsx
<button 
  aria-label="Close dialog"
  aria-pressed={isPressed}
  onClick={handleClose}
>
  X
</button>
```

### 3. Keyboard Navigation

Ensure all interactive elements are keyboard accessible.

```tsx
function Dropdown({ options, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      setIsOpen(!isOpen);
    }
  };
  
  return (
    <div 
      tabIndex={0} 
      role="button"
      onKeyDown={handleKeyDown}
      onClick={() => setIsOpen(!isOpen)}
    >
      {/* Dropdown content */}
    </div>
  );
}
```

## Component Documentation

Each component should include:

1. A clear description of its purpose
2. Documentation of all props
3. Usage examples

```tsx
/**
 * FileUploadZone - A component that allows users to upload files via drag and drop or file selection.
 *
 * @example
 * ```tsx
 * <FileUploadZone
 *   onFileSelected={handleFileSelected}
 *   acceptedFormats={['pdf', 'docx']}
 *   maxFileSize={10 * 1024 * 1024} // 10MB
 * />
 * ```
 */
interface FileUploadZoneProps {
  /** Called when a file is selected */
  onFileSelected: (file: File) => void;
  /** List of accepted file formats */
  acceptedFormats?: string[];
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Whether the component is disabled */
  disabled?: boolean;
}

export function FileUploadZone(props: FileUploadZoneProps) {
  // Implementation
}
```

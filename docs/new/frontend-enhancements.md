# TrustyConvert Frontend Enhancements

This document outlines recent enhancements to the TrustyConvert frontend codebase, focusing on improved architecture, state management, error handling, and user experience.

## Table of Contents

1. [Toast Messaging System](#toast-messaging-system)
2. [Error Handling](#error-handling)
3. [State Management](#state-management)
4. [Conversion Flow](#conversion-flow)
5. [Session Management](#session-management)
6. [Best Practices](#best-practices)

## Toast Messaging System

### Architecture

The application uses a two-layer toast notification system:

1. **Low-level Event-Based System** (`ToastListener.tsx`): Provides the core toast functionality through custom events, allowing any part of the application to trigger toast notifications, including non-React code.

2. **High-level Message Utilities** (`messageUtils.ts`): Offers standardized message templates, formatting, and consistent styling for user feedback.

### Usage Examples

```typescript
// Using messageUtils (recommended)
import { showSuccess, showError, MESSAGE_TEMPLATES, formatMessage } from '@/lib/utils/messageUtils';

// Simple usage
showSuccess('File uploaded successfully');

// Using templates
showSuccess(MESSAGE_TEMPLATES.conversion.complete);

// With formatting
showInfo(formatMessage(MESSAGE_TEMPLATES.upload.inProgress, { progress: 75 }));

// With custom options
showWarning(MESSAGE_TEMPLATES.session.expired, {
  duration: 0, // Stay until dismissed
  dismissible: true
});
```

For more detailed information, see the [Toast Messaging System documentation](./toast-messaging-system.md).

## Error Handling

### Centralized Error Handling

The application now uses a centralized error handling approach through `lib/utils/errorHandling.ts`:

- Standardized error types (ApiError, NetworkError, ValidationError, etc.)
- Consistent error reporting and logging
- Integration with toast notifications
- Global error handlers for uncaught exceptions

### Usage Examples

```typescript
import { handleError, withErrorHandling } from '@/lib/utils/errorHandling';

// Basic error handling
try {
  await apiCall();
} catch (error) {
  handleError(error, {
    context: { component: 'FileUploader', action: 'uploadFile' },
    showToast: true
  });
}

// Wrapping functions with error handling
const safeFunction = withErrorHandling(riskyFunction);
```

## State Management

### Store Utilities

The application now includes improved store utilities in `lib/stores/storeUtils.ts`:

- Helper functions for common store patterns
- Type-safe store creation and usage
- Custom React hooks for working with stores

### Usage Examples

```typescript
import { createDerivedStore } from '@/lib/stores/storeUtils';
import { useStore } from '@/lib/hooks/useStore';

// Create a derived store
const isUploadingStore = createDerivedStore(uploadStore, (state) => state.status === 'uploading');

// Use in a component
function UploadIndicator() {
  const isUploading = useStore(isUploadingStore);
  return isUploading ? <Spinner /> : null;
}
```

## Conversion Flow

The conversion flow has been enhanced with:

- Better error handling and recovery
- Improved progress tracking
- More consistent user feedback
- Type-safe state management

### Key Components

- `ConversionFlow.tsx`: Main conversion flow component
- `conversion.ts`: Store for conversion state
- `jobPollingService.ts`: Service for polling job status

## Session Management

Session management has been improved with:

- Better error handling for session expiration
- Cleaner session cleanup
- Type-safe session state

### Key Components

- `CloseSession.tsx`: Component for closing sessions
- `session.ts`: Store for session state
- `sessionManager.ts`: Service for session operations

## Best Practices

### Code Organization

- **Separation of Concerns**: UI components are separated from business logic
- **DRY Principle**: Common functionality is extracted into reusable utilities
- **Type Safety**: TypeScript is used throughout the codebase for better type safety

### Error Handling

- Always use the centralized error handling utilities
- Provide context when handling errors
- Show user-friendly error messages

### State Management

- Use stores for shared state
- Use derived stores for computed values
- Use hooks for accessing store state in components

### User Experience

- Provide consistent feedback for user actions
- Use standardized message templates
- Set appropriate durations for toast messages

## Future Improvements

1. **Complete Store Migration**: Migrate all remaining state to the new store pattern
2. **Standardize API Client Usage**: Ensure all API calls use the centralized client
3. **Implement Error Boundaries**: Add React error boundaries for better error recovery
4. **Enhance Session Management**: Improve session expiration handling
5. **Performance Optimization**: Add code splitting and lazy loading
6. **Testing Strategy**: Implement comprehensive testing for critical components 
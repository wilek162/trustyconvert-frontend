# Toast Messaging System

## Overview

The TrustyConvert application uses a two-layer toast notification system:

1. **Low-level Event-Based System** (`ToastListener.tsx`): Provides the core toast functionality through custom events, allowing any part of the application to trigger toast notifications, including non-React code.

2. **High-level Message Utilities** (`messageUtils.ts`): Offers standardized message templates, formatting, and consistent styling for user feedback.

This architecture ensures consistent user messaging across the application while maintaining flexibility for different frameworks (React, Astro) and code contexts.

## Key Components

### ToastListener Component

Located at `src/components/providers/ToastListener.tsx`, this component:

- Listens for custom toast events
- Renders toast notifications using the Sonner library
- Provides a `showToast()` utility function for direct usage

```typescript
// Example: Direct usage of showToast
import { showToast } from '@/components/providers/ToastListener';

showToast('Operation completed', 'success');
showToast('Error occurred', 'error', 10000); // 10 second duration
showToast('Custom message', 'info', 5000, {
  dismissible: true,
  id: 'custom-id'
});
```

### Message Utilities

Located at `src/lib/utils/messageUtils.ts`, this module:

- Provides standardized message templates
- Offers helper functions for different message types
- Handles consistent formatting and styling

```typescript
// Example: Using messageUtils
import { showSuccess, showError, MESSAGE_TEMPLATES, formatMessage } from '@/lib/utils/messageUtils';

// Simple usage
showSuccess('File uploaded successfully');
showError('Failed to connect to server');

// Using templates
showSuccess(MESSAGE_TEMPLATES.conversion.complete);

// With formatting
showInfo(formatMessage(MESSAGE_TEMPLATES.upload.inProgress, { progress: 75 }));

// With custom options
showWarning(MESSAGE_TEMPLATES.session.expired, {
  duration: 0, // Stay until dismissed
  dismissible: true,
  id: 'session-expired-toast'
});
```

## Message Templates

The system provides standardized message templates for common scenarios:

```typescript
// Available message templates
MESSAGE_TEMPLATES.conversion.started    // "Starting file conversion..."
MESSAGE_TEMPLATES.upload.complete       // "File uploaded successfully!"
MESSAGE_TEMPLATES.download.preparing    // "Preparing your file for download..."
MESSAGE_TEMPLATES.session.expired       // "Your session has expired. Please refresh the page."
MESSAGE_TEMPLATES.generic.networkError  // "Network error. Please check your connection."
```

## Message Formatting

For templates with placeholders, use the `formatMessage` function:

```typescript
import { formatMessage, MESSAGE_TEMPLATES } from '@/lib/utils/messageUtils';

// Format a template with variables
const message = formatMessage(MESSAGE_TEMPLATES.upload.inProgress, { progress: 75 });
// Result: "Uploading: 75%"

const errorMsg = formatMessage(MESSAGE_TEMPLATES.upload.tooLarge, { maxSize: '10MB' });
// Result: "File is too large. Maximum size is 10MB."
```

## Best Practices

1. **Prefer `messageUtils` over direct `showToast` calls**:
   - Use `messageUtils` for application-level messaging
   - Reserve direct `showToast` calls for component-specific feedback

2. **Use standard templates when available**:
   - Promotes consistency in user messaging
   - Makes it easier to update messaging across the application

3. **Set appropriate durations**:
   - Success messages: 3-5 seconds
   - Info messages: 5-8 seconds
   - Warnings: 8-10 seconds
   - Errors: 10+ seconds or require manual dismissal

4. **Use formatting for dynamic content**:
   - Always use `formatMessage` for templates with placeholders
   - Don't concatenate strings manually

## Implementation Details

### Event-Based Architecture

The toast system uses custom events to decouple the toast UI from the code that triggers it:

1. `showToast()` dispatches a custom `toast:show` event
2. `ToastListener` component listens for these events and renders toasts
3. This allows non-React code (like Astro components) to trigger toasts

### Toast Options

Available options for toast messages:

| Option | Type | Description |
|--------|------|-------------|
| `duration` | number | Display duration in milliseconds (0 for no auto-dismiss) |
| `dismissible` | boolean | Whether to show a close button |
| `id` | string | Custom ID for tracking/analytics |

### Message Severity Levels

Four severity levels are available:

- `info`: For general information
- `success`: For successful operations
- `warning`: For potential issues
- `error`: For errors and failures

## Integration with Error Handling

The toast system integrates with the application's error handling utilities:

```typescript
import { handleError } from '@/lib/utils/errorHandling';

try {
  // Some operation
} catch (error) {
  // Log error and show toast to user
  handleError(error, {
    context: { component: 'FileUploader', action: 'uploadFile' },
    showToast: true
  });
}
```

## Future Improvements

Potential enhancements for the toast system:

1. **Toast Queuing**: Implement a queue for multiple toasts to prevent overwhelming the UI
2. **Toast Groups**: Group related toasts together
3. **Action Toasts**: Add support for toasts with action buttons
4. **Persistence**: Option to persist important toasts across page refreshes
5. **Analytics Integration**: Track user interactions with toast messages 
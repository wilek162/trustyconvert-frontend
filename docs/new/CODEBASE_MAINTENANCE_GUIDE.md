# TrustyConvert Frontend Codebase Maintenance Guide

## Introduction

This document outlines the architecture, design patterns, and maintenance guidelines for the TrustyConvert frontend application. Following these guidelines will ensure a clean, maintainable codebase and a flawless user experience.

## Architecture Overview

The TrustyConvert frontend follows a layered architecture with clear separation of concerns:

1. **UI Layer**: React/Astro components that handle user interactions
2. **Service Layer**: Business logic and coordination between UI and data
3. **API Layer**: Communication with the backend services
4. **State Management**: Client-side state using nanostores

## Core Modules and Responsibilities

### API Client Structure

The API client is structured in three layers:

1. **_apiClient.ts**: Low-level HTTP client
   - Makes raw HTTP requests to the backend
   - Handles HTTP-specific concerns (headers, timeouts, etc.)
   - Processes API responses and extracts CSRF tokens

2. **client.ts**: High-level API client
   - Provides a clean interface for components
   - Coordinates with sessionManager for session state
   - Handles error processing and retry logic
   - Standardizes response formats

3. **sessionManager.ts**: Session state management
   - Manages client-side session state
   - Stores and provides CSRF tokens
   - Tracks session initialization state

### Session Management

Session management follows a "check-then-act" pattern:

1. Check if a valid session exists in the store
2. If not, initialize a new session
3. Ensure CSRF tokens are properly handled
4. Provide session state to components

## Coding Guidelines and Rules

### General Rules

1. **Single Responsibility Principle**: Each module should have one clear responsibility
2. **Dependency Direction**: Lower layers should not depend on higher layers
3. **Error Handling**: Centralize error handling in appropriate layers
4. **State Management**: Use nanostores for client-side state
5. **Debugging**: Use the debugging utilities for consistent logging

### API Client Rules

1. **Direct API Access**: Components should never use `_apiClient.ts` directly
2. **Session Checking**: Always check session state before making API calls
3. **Error Handling**: Handle API errors at the client.ts level
4. **CSRF Protection**: Ensure CSRF tokens are included in all non-GET requests
5. **Retry Logic**: Use the retry utilities for API calls that may fail temporarily

### Session Management Rules

1. **Session Initialization**: Use `sessionManager.ensureSession()` to ensure a valid session exists
2. **Token Management**: Never manually manipulate CSRF tokens; use the sessionManager methods
3. **State Checking**: Always check if a session exists before performing operations that require it
4. **Error Recovery**: Implement proper error recovery for session failures
5. **Debugging**: Use the session debugging utilities in development

## Component Integration Patterns

### Session-Aware Components

Components that need to interact with the API should:

1. Import and use the `useSession` hook
2. Check `isSessionInitialized` before making API calls
3. Call `initSession` when needed
4. Handle session initialization errors gracefully

```tsx
// Example of a session-aware component
function MyComponent() {
  const { isSessionInitialized, initSession } = useSession();
  
  useEffect(() => {
    if (!isSessionInitialized) {
      initSession().catch(console.error);
    }
  }, [isSessionInitialized]);
  
  // Component logic...
}
```

### API Integration

Components should use the client.ts methods for API calls:

```tsx
// Example of API integration
import client from '@/lib/api/client';

async function handleUpload(file) {
  try {
    // client.ts handles session checking internally
    const response = await client.uploadFile(file);
    // Handle response...
  } catch (error) {
    // Handle errors...
  }
}
```

## Performance Optimization

1. **Minimize API Calls**: Check if data exists locally before making API calls
2. **Session Reuse**: Reuse existing sessions when possible
3. **Batch Operations**: Combine related operations when possible
4. **Lazy Loading**: Load components and data only when needed
5. **Debounce/Throttle**: Apply debouncing for frequent operations

## Error Handling Strategy

1. **Centralized Error Handling**: Use the error handling utilities
2. **User-Friendly Messages**: Display appropriate error messages to users
3. **Error Recovery**: Implement recovery mechanisms for common errors
4. **Logging**: Log errors for debugging but avoid exposing sensitive information
5. **Retry Logic**: Use retry mechanisms for transient failures

## Testing Guidelines

1. **Unit Tests**: Test individual functions and components in isolation
2. **Integration Tests**: Test interactions between components
3. **API Mocking**: Use mock API responses for testing
4. **Session Mocking**: Mock session state for testing components
5. **Error Scenarios**: Test error handling and recovery

## Debugging and Troubleshooting

1. **Development Logging**: Use the debugging utilities in development
2. **Session Debugging**: Use sessionManager.getDebugInfo() for session issues
3. **API Debugging**: Check network requests in browser developer tools
4. **State Inspection**: Inspect nanostore state for unexpected values
5. **Error Tracing**: Use correlation IDs for tracing errors across systems

## Common Pitfalls to Avoid

1. **Circular Dependencies**: Avoid circular imports between modules
2. **Direct API Access**: Never use _apiClient directly from components
3. **Manual CSRF Handling**: Don't manually manipulate CSRF tokens
4. **Ignoring Session State**: Always check session state before API calls
5. **Inconsistent Error Handling**: Use the centralized error handling

## Future Maintenance

When making changes to the codebase:

1. **Respect Boundaries**: Maintain the separation of concerns
2. **Update Documentation**: Keep this guide updated with architectural changes
3. **Consistent Patterns**: Follow established patterns for new features
4. **Performance Considerations**: Consider performance implications of changes
5. **Backwards Compatibility**: Ensure changes don't break existing functionality

By following these guidelines, we can maintain a clean, maintainable codebase that provides a flawless user experience. 
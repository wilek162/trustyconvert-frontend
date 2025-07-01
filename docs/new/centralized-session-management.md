# Centralized Session Management

## Overview

This document describes the centralized session management approach implemented in TrustyConvert to prevent multiple session initializations and ensure consistent session state across the application.

## Problem Statement

Previously, our application had several issues with session management:

1. **Multiple Entry Points**: Session initialization could be triggered from various components
2. **Redundant API Calls**: Each component might independently attempt to initialize a session
3. **Race Conditions**: Concurrent initialization attempts could lead to inconsistent state
4. **Difficult to Track**: It was hard to know where and when sessions were being created/updated

## Solution Architecture

We've implemented a three-layer architecture for centralized session management:

1. **SessionManager Service** (Singleton)
   - Handles all direct interactions with the server for session management
   - Implements debouncing and throttling to prevent redundant API calls
   - Provides a global initialization promise to prevent concurrent initializations

2. **SessionContext Provider**
   - Provides session state and actions to the entire application via React Context
   - Acts as the single source of truth for session state in the component tree
   - Handles visibility changes and CSRF error events

3. **Nanostore State**
   - Stores the CSRF token and session initialization state
   - Provides reactivity for components that need to respond to session changes
   - Persists session state across component renders

## Key Components

### 1. SessionManager Service

The `SessionManager` service (`src/lib/services/sessionManager.ts`) implements:

- **Debouncing**: Prevents multiple initialization attempts within a short time period
- **Global Promise**: Shares a single initialization promise across multiple calls
- **Token Synchronization**: Ensures the nanostore is always updated when tokens change

Key improvements:

```typescript
// Global session initialization state
let isInitializing = false
let initializationPromise: Promise<boolean> | null = null
let lastInitAttempt = 0
const MIN_INIT_INTERVAL = 2000 // Minimum time between initialization attempts (ms)

// Debounce initialization attempts
const now = Date.now()
if (!forceNew && now - lastInitAttempt < MIN_INIT_INTERVAL) {
  debugLog('Session initialization throttled - recent attempt detected')
  
  // If we have an existing initialization in progress, return that
  if (initializationPromise && isInitializing) {
    debugLog('Returning existing initialization promise')
    return initializationPromise
  }
  
  // Otherwise, just return the current state
  return this.hasCsrfToken()
}
```

### 2. SessionContext Provider

The `SessionContextProvider` component (`src/lib/providers/SessionContext.tsx`) provides:

- **React Context API**: Makes session state and actions available throughout the component tree
- **Unified API**: Provides a consistent interface for components to interact with sessions
- **Automatic Initialization**: Handles initial session setup on application load

```typescript
// Hook for using the session context
export const useSession = () => useContext(SessionContext)

// Context value
const contextValue: SessionContextType = {
  isInitialized: isSessionInitialized,
  isInitializing,
  hasCsrfToken,
  ensureSession,
  resetSession,
  lastError
}
```

### 3. Component Integration

Components now use the SessionContext to access session state and actions:

```typescript
// In a component
const { isInitialized, isInitializing, ensureSession } = useSession()

// Before making API requests
const handleSubmit = async () => {
  // This will use the shared initialization promise if one is in progress
  const success = await ensureSession()
  if (success) {
    // Proceed with API call
  }
}
```

## Session Lifecycle

1. **Application Load**:
   - SessionContextProvider initializes once at the root level
   - It attempts to synchronize from cookie first
   - Only creates a new session if no valid token exists

2. **Component Interactions**:
   - Components use the useSession() hook to access session state
   - All session actions go through the centralized context
   - The SessionManager ensures only one initialization happens at a time

3. **API Requests**:
   - Components call ensureSession() before making API requests
   - This returns the existing initialization promise if one is in progress
   - The SessionManager handles debouncing and throttling

4. **Session Updates**:
   - When the server returns a new CSRF token, the SessionManager updates the nanostore
   - The SessionContext reacts to nanostore changes
   - All components using the useSession() hook automatically get the updated state

## Benefits

1. **Reduced API Calls**: Prevents redundant session initialization requests
2. **Consistent State**: Ensures all components see the same session state
3. **Simplified Component Logic**: Components don't need to manage sessions directly
4. **Better Debugging**: Centralized logging and state tracking
5. **Prevent Race Conditions**: Only one initialization can happen at a time

## Implementation Notes

1. The SessionManager is a singleton that manages all server interactions
2. The SessionContext provides a React-friendly interface to the SessionManager
3. Components should always use the useSession() hook instead of direct SessionManager calls
4. Debouncing and throttling prevent excessive API calls
5. The global initialization promise ensures concurrent calls share the same result 
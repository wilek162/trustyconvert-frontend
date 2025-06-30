# Code Cleanup Plan for TrustyConvert Frontend

This document outlines the redundancies found in the codebase and a plan to clean them up.

## Identified Redundancies

### 1. Multiple Retry Implementations

There are three different implementations of retry functionality:

- `src/lib/utils/retry.ts` - Main implementation with comprehensive features
- `src/lib/retry.ts` - Duplicate implementation with slightly different interface
- `src/lib/utils.ts` - Simple retry function with less features

**Solution:** Standardize on the `src/lib/utils/retry.ts` implementation and remove the others.

### 2. Duplicate Utility Functions

Several utility functions are duplicated across different files:

- `cn()` function appears in both `src/lib/utils.ts` and `src/lib/utils/utils.ts`
- `generateId()` in `src/lib/utils.ts` and `generateRandomString()` in the same file serve similar purposes
- Multiple implementations of delay/sleep functions

**Solution:** Consolidate all utility functions into appropriate categorized files under `src/lib/utils/`.

### 3. Inconsistent Error Handling

Error handling is spread across multiple files with different patterns:

- `src/lib/utils/errorHandling.ts` - Main error handling utilities
- Various custom error handling in components
- Inconsistent use of error types

**Solution:** Standardize on the error handling utilities from `src/lib/utils/errorHandling.ts`.

## Action Plan

### 1. Consolidate Retry Logic

1. Keep `src/lib/utils/retry.ts` as the standard implementation
2. Remove `src/lib/retry.ts`
3. Remove the `retry()` function from `src/lib/utils.ts`
4. Update all imports to reference the standard implementation

### 2. Organize Utility Functions

1. Create categorized utility files:
   - `src/lib/utils/string.ts` - String manipulation functions
   - `src/lib/utils/dom.ts` - DOM-related utilities
   - `src/lib/utils/format.ts` - Formatting utilities
   - `src/lib/utils/random.ts` - Random generation utilities

2. Move functions to appropriate files:
   - Move `cn()` to `src/lib/utils/dom.ts` and remove the duplicate
   - Move string manipulation functions to `src/lib/utils/string.ts`
   - Consolidate random generation functions in `src/lib/utils/random.ts`

3. Create a comprehensive index file that re-exports all utilities

### 3. Standardize Error Handling

1. Ensure all components use the error handling utilities from `src/lib/utils/errorHandling.ts`
2. Use the `handleError()` function consistently
3. Use typed error classes for better error categorization

### 4. Clean Up API Client

1. Ensure consistent use of the public API client (`client.ts`) instead of direct use of `_apiClient.ts`
2. Standardize response handling
3. Ensure consistent CSRF token handling

### 5. Update Documentation

1. Document all utility functions with JSDoc comments
2. Update the component guidelines to reference the standardized utilities
3. Create examples of proper error handling

## Implementation Priority

1. **High Priority**
   - Consolidate retry logic (impacts reliability)
   - Standardize error handling (impacts user experience)

2. **Medium Priority**
   - Organize utility functions (impacts maintainability)
   - Clean up API client (impacts security and reliability)

3. **Low Priority**
   - Update documentation (impacts developer experience)

## Testing Strategy

For each change:

1. Identify all usages of the function being modified
2. Create unit tests for the consolidated functions
3. Test affected components
4. Run the full test suite

## Rollout Plan

1. Make changes in feature branches
2. Review changes with the team
3. Merge changes in the following order:
   - Utility function organization
   - Retry logic consolidation
   - Error handling standardization
   - API client cleanup
   - Documentation updates 
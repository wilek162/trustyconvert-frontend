# File Conversion Architecture

This document outlines the architecture of the file conversion system in TrustyConvert, explaining the responsibilities of each component, error handling strategies, and how clean code principles are applied.

## Overview

The file conversion system is built with a modular architecture following clean code principles like Single Responsibility, DRY (Don't Repeat Yourself), and Separation of Concerns. The system consists of several interconnected components that handle different aspects of the conversion process:

1. **API Client** - Handles communication with the backend API
2. **Job Polling Service** - Manages status polling for conversion jobs
3. **Conversion Store** - Maintains conversion state
4. **React Hooks** - Provides React components with conversion functionality
5. **UI Components** - Presents conversion interface to users

## Component Responsibilities

### 1. API Client (`src/lib/api/client.ts`, `src/lib/api/_apiClient.ts`)

**Responsibility**: Communication with the backend API

- Handles authentication and CSRF protection
- Provides standardized response handling
- Implements retry logic for network failures
- Manages timeouts adaptively based on file size

**Clean Code Principles**:
- Single Responsibility: Focused solely on API communication
- Abstraction: Hides implementation details behind a clean interface
- Error Handling: Centralized error handling with detailed context

### 2. Job Polling Service (`src/lib/services/jobPollingService.ts`)

**Responsibility**: Polling for job status updates

- Manages polling intervals and cleanup
- Provides adaptive polling based on file size and status
- Handles errors and timeouts
- Prevents duplicate polling for the same job

**Clean Code Principles**:
- Separation of Concerns: Dedicated to polling functionality
- DRY: Centralizes polling logic to avoid duplication
- Configurability: Adaptive behavior based on context

### 3. Conversion Store (`src/lib/stores/conversion.ts`)

**Responsibility**: State management for conversions

- Maintains current conversion state
- Provides actions to update state
- Tracks conversion progress and results

**Clean Code Principles**:
- Single Source of Truth: Central store for conversion state
- Immutability: State updates follow immutable patterns
- Encapsulation: Internal state protected by public interface

### 4. React Hooks

#### `useConversionStatus` (`src/lib/hooks/useConversionStatus.ts`)

**Responsibility**: Track conversion status for React components

- Connects to job polling service
- Manages local state for status, progress, etc.
- Handles cleanup on unmount

**Clean Code Principles**:
- Reusability: Can be used by any component needing status updates
- Composition: Uses jobPollingService rather than reimplementing polling
- Lifecycle Management: Proper cleanup on unmount

#### `useFileConversion` (`src/lib/hooks/useFileConversion.ts`)

**Responsibility**: Manage the full conversion flow

- File selection and validation
- Format selection
- Starting conversions
- Status tracking
- Error handling

**Clean Code Principles**:
- Higher-level Abstraction: Combines lower-level hooks into a complete solution
- Separation of Concerns: Delegates specialized tasks to other modules
- Error Handling: Comprehensive error handling and user feedback

### 5. UI Components

#### `ConversionFlow` (`src/components/features/conversion/ConversionFlow.tsx`)

**Responsibility**: User interface for conversion process

- File upload UI
- Format selection UI
- Progress display
- Error presentation
- Download interface

**Clean Code Principles**:
- Presentational Focus: Primarily concerned with UI rendering
- Delegation: Uses hooks for business logic
- State Management: Clear separation of UI state from business logic

## Error Handling Strategy

The system implements a comprehensive error handling strategy:

1. **Layered Error Handling**:
   - Low-level errors captured in API client
   - Service-specific errors handled in respective services
   - UI-level error presentation managed by components

2. **Centralized Error Processing**:
   - Common error handling utilities in `src/lib/utils/errorHandling.ts`
   - Standardized error types and messages
   - Context enrichment for debugging

3. **User Feedback**:
   - Meaningful error messages for users
   - Visual indicators of error states
   - Recovery options when possible

4. **Retry Logic**:
   - Automatic retries for transient errors
   - Exponential backoff to prevent overwhelming the server
   - Configurable retry strategies for different operations

## Clean Code Principles Applied

### 1. Single Responsibility Principle
Each module has a clear, focused responsibility:
- API client handles only API communication
- Polling service manages only status polling
- Hooks provide only React integration

### 2. DRY (Don't Repeat Yourself)
- Centralized polling logic in jobPollingService
- Shared error handling utilities
- Reusable hooks for common patterns

### 3. Separation of Concerns
- Data fetching separate from state management
- State management separate from UI rendering
- Configuration separate from implementation

### 4. SOLID Principles
- **Single Responsibility**: Each module does one thing well
- **Open/Closed**: Extensions via composition rather than modification
- **Liskov Substitution**: Consistent interfaces for similar components
- **Interface Segregation**: Focused, specific interfaces
- **Dependency Inversion**: High-level modules depend on abstractions

### 5. Defensive Programming
- Comprehensive error handling
- Null/undefined checking
- Fallback values for missing data
- Timeout handling for long-running operations

## Adaptive Behavior for Large Files

The system includes special handling for large files:

1. **Adaptive Polling**:
   - Longer intervals for larger files
   - Progressive backoff for long-running jobs
   - File size-based timeout calculations

2. **Enhanced Progress Tracking**:
   - More detailed progress information for large files
   - Estimated time remaining when available
   - Clear user feedback about long-running operations

3. **Timeout Management**:
   - Extended timeouts for large file operations
   - Graceful timeout handling with informative messages
   - Retry strategies optimized for large files

## Conclusion

The file conversion architecture follows a modular, maintainable design that separates concerns, promotes code reuse, and implements comprehensive error handling. By following clean code principles, the system remains flexible, testable, and easy to extend with new features. 
# API Calling Lifecycle and Session Management Fixes

## Overview

This document summarizes the changes made to fix issues with the API calling lifecycle and session management in the TrustyConvert frontend application. The main problems addressed were:

1. Duplicate session initialization calls
2. Unlimited job status polling
3. Missing retry logic for API calls
4. Inconsistent CSRF token handling
5. Poor cleanup of resources

## Key Changes

### 1. Enhanced Session Manager

The session manager was enhanced to provide better control over session initialization:

- Added a debounced initialization method to prevent duplicate calls
- Implemented proper session state tracking
- Added retry logic for session initialization
- Improved token synchronization between memory and cookies

```typescript
// New debounced initialization method
export function debouncedInitSession(): Promise<boolean> {
	// If we already have a valid token, return immediately
	if (hasCsrfToken() && sessionInitialized) {
		return Promise.resolve(true)
	}

	// Return existing promise if initialization is in progress
	if (initializationPromise && isInitializing) {
		return initializationPromise
	}

	// Create a new promise for this debounced call
	return new Promise((resolve) => {
		// Clear any existing timeout
		if (debounceTimeout) {
			clearTimeout(debounceTimeout)
		}

		// Set a new timeout
		debounceTimeout = setTimeout(() => {
			// Start the actual initialization
			initSession().then(resolve)
		}, DEBOUNCE_DELAY)
	})
}
```

### 2. Centralized Job Polling Service

Created a new service to handle job status polling with proper cleanup and error handling:

- Maintains a registry of active polling jobs
- Implements automatic backoff for failed requests
- Provides callbacks for status updates
- Ensures proper cleanup of polling intervals
- Prevents duplicate polling for the same job

```typescript
// Start polling for a job's status
export function startPolling(
	jobId: string,
	callbacks: {
		onProgress?: (progress: number) => void
		onCompleted?: (downloadToken: string, downloadUrl: string) => void
		onFailed?: (errorMessage: string) => void
		onStatusChange?: (status: string, progress: number) => void
	} = {},
	initialInterval = DEFAULT_POLLING_INTERVAL
): () => void {
	// If already polling this job, update callbacks and return existing stop function
	if (activePollingJobs.has(jobId)) {
		const existingJob = activePollingJobs.get(jobId)!
		existingJob.callbacks = { ...existingJob.callbacks, ...callbacks }
		return () => stopPolling(jobId)
	}

	// Create a new polling job
	const startTime = Date.now()
	let currentInterval = initialInterval
	let errorCount = 0

	// Create the polling function
	const pollFunction = async () => {
		// Implementation details...
	}

	// Start polling
	const intervalId = setInterval(pollFunction, currentInterval)

	// Store the polling job
	activePollingJobs.set(jobId, {
		jobId,
		intervalId,
		startTime,
		currentInterval,
		errorCount,
		lastPollTime: Date.now(),
		callbacks
	})

	// Execute immediately for first status check
	pollFunction()

	// Return a function to stop polling
	return () => stopPolling(jobId)
}
```

### 3. API Client with Retry Logic

Enhanced the API client to properly integrate retry logic and improve error handling:

- Added retry logic for all API calls
- Improved error handling and recovery
- Ensured consistent CSRF token validation
- Added proper validation of API responses

```typescript
// Example of retry logic integration
const response = await withRetry(() => uploadFile(file, fileJobId), {
	...RETRY_STRATEGIES.API_REQUEST,
	onRetry: (error, attempt) => {
		debugLog(`Retrying file upload (attempt ${attempt}) for job ${fileJobId}`)
	},
	isRetryable: (error) => {
		// Don't retry if it's a file validation error
		if (error.message?.includes('validation') || error.message?.includes('invalid file')) {
			return false
		}
		return isRetryableError(error)
	}
})
```

### 4. Updated ConversionFlow Component

Updated the ConversionFlow component to use the improved session management and job polling service:

- Replaced direct interval-based polling with the polling service
- Implemented proper cleanup of resources
- Used debounced session initialization
- Improved error handling and user feedback

```typescript
// Start polling for job status using the polling service
stopPollingRef.current = jobPollingService.startPolling(newJobId, {
	onProgress: (progress) => {
		setConversionProgress(progress)
	},
	onStatusChange: (status, progress) => {
		debugLog(`Job ${newJobId} status updated to ${status} (${progress}%)`)
	},
	onCompleted: (downloadToken, downloadUrl) => {
		setDownloadUrl(downloadUrl)
		setIsConverting(false)
		setCurrentStep('download')
		toast.success('File converted successfully!')
	},
	onFailed: (errorMessage) => {
		setIsConverting(false)
		setError(errorMessage || 'Conversion failed')
		toast.error('Conversion failed. Please try again.')
	}
})
```

### 5. Improved SessionProvider

Updated the SessionProvider component to use the improved session management:

- Used debounced session initialization to prevent duplicate calls
- Added tracking of initialization attempts
- Improved visibility change handling
- Enhanced error recovery

```typescript
// Initialize session on mount using the debounced version to prevent duplicate calls
useEffect(() => {
	const initializeSession = async () => {
		if (initAttemptedRef.current) return

		try {
			initAttemptedRef.current = true
			setIsInitializing(true)

			// Use the debounced version to prevent duplicate calls
			const success = await sessionManager.debouncedInitSession()

			if (success) {
				setError(null)
			} else {
				setError('Failed to initialize session')

				// Try one more time after a delay
				setTimeout(async () => {
					try {
						await sessionManager.resetSession()
						setError(null)
					} catch (retryErr) {
						// Handle retry error
					}
				}, 2000)
			}
		} catch (err) {
			// Handle error
		} finally {
			setIsInitializing(false)
		}
	}

	initializeSession()
}, [])
```

## Benefits of Changes

1. **Reduced Network Requests**: Debounced session initialization prevents duplicate API calls
2. **Improved Reliability**: Proper retry logic ensures operations succeed even with temporary network issues
3. **Better Resource Management**: Polling jobs are properly tracked and cleaned up
4. **Enhanced User Experience**: More consistent error handling and feedback
5. **Reduced Server Load**: Backoff strategies prevent hammering the server when issues occur
6. **Improved Maintainability**: Centralized services make the code easier to maintain and extend

## Testing

These changes were tested in various scenarios:

- Initial page load
- Page refresh
- Returning to the page after being away
- Multiple file conversions
- Network interruptions
- Session expiration

All tests confirmed that the API calling lifecycle and session management are now properly handled throughout the application.

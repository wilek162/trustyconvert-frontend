/**
 * Global Error Boundary Component
 *
 * Catches and handles errors in React component trees to prevent
 * the entire application from crashing when an error occurs.
 * Provides fallback UI and error reporting functionality.
 */

import React, { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { reportError } from '@/lib/monitoring/init'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryProps {
	/**
	 * Child components to be rendered and monitored for errors
	 */
	children: ReactNode

	/**
	 * Optional custom fallback component to render when an error occurs
	 */
	fallback?: ReactNode

	/**
	 * Optional callback function to be called when an error is caught
	 */
	onError?: (error: Error, errorInfo: ErrorInfo) => void

	/**
	 * Whether to reset the error state when the component receives new props
	 * @default true
	 */
	resetOnPropsChange?: boolean
}

interface ErrorBoundaryState {
	/**
	 * Whether an error has been caught
	 */
	hasError: boolean

	/**
	 * The error that was caught
	 */
	error: Error | null
}

/**
 * Error Boundary component that catches JavaScript errors in its child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the whole app.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props)
		this.state = { hasError: false, error: null }
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		// Update state so the next render will show the fallback UI
		return { hasError: true, error }
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
		// Report the error to monitoring service
		reportError(error, {
			componentStack: errorInfo.componentStack,
			errorBoundary: true
		})

		// Call the optional onError callback
		if (this.props.onError) {
			this.props.onError(error, errorInfo)
		}

		// Log the error in development
		if (import.meta.env.DEV) {
			console.error('Error caught by ErrorBoundary:', error)
			console.error('Component stack:', errorInfo.componentStack)
		}
	}

	componentDidUpdate(prevProps: ErrorBoundaryProps): void {
		// Reset error state when props change if resetOnPropsChange is true
		if (
			this.state.hasError &&
			this.props.resetOnPropsChange !== false &&
			prevProps.children !== this.props.children
		) {
			this.setState({ hasError: false, error: null })
		}
	}

	/**
	 * Reset the error state manually
	 */
	resetErrorBoundary = (): void => {
		this.setState({ hasError: false, error: null })
	}

	render(): ReactNode {
		if (this.state.hasError) {
			// Render custom fallback if provided
			if (this.props.fallback) {
				return this.props.fallback
			}

			// Default fallback UI
			return (
				<div className="my-4 rounded-lg border border-red-100 bg-red-50 p-6 text-red-800">
					<h2 className="mb-2 text-lg font-medium">Something went wrong</h2>
					<p className="mb-4 text-sm">
						We've encountered an unexpected error. Our team has been notified and is working to fix
						the issue.
					</p>
					<div className="flex gap-3">
						<Button onClick={this.resetErrorBoundary} variant="secondary" size="sm">
							Try again
						</Button>
						<Button onClick={() => window.location.reload()} variant="outline" size="sm">
							Reload page
						</Button>
					</div>
				</div>
			)
		}

		// When there's no error, render children normally
		return this.props.children
	}
}

/**
 * Higher-order component that wraps a component with an ErrorBoundary
 *
 * @param Component - Component to wrap
 * @param errorBoundaryProps - Props to pass to the ErrorBoundary
 * @returns Wrapped component with error boundary
 */
export function withErrorBoundary<P extends object>(
	Component: React.ComponentType<P>,
	errorBoundaryProps: Omit<ErrorBoundaryProps, 'children'> = {}
): React.FC<P> {
	const displayName = Component.displayName || Component.name || 'Component'

	const ComponentWithErrorBoundary: React.FC<P> = (props) => {
		return (
			<ErrorBoundary {...errorBoundaryProps}>
				<Component {...props} />
			</ErrorBoundary>
		)
	}

	ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`

	return ComponentWithErrorBoundary
}

/**
 * Context provider for error boundary reset functionality
 */
export const ErrorBoundaryContext = React.createContext<{
	resetErrorBoundary: () => void
}>({
	resetErrorBoundary: () => {}
})

/**
 * Hook to access error boundary reset functionality
 */
export function useErrorBoundary(): { resetErrorBoundary: () => void } {
	return React.useContext(ErrorBoundaryContext)
}

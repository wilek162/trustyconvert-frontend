/**
 * Analytics utilities for tracking user interactions and application metrics
 */

interface AnalyticsEvent {
	category: string
	action: string
	label?: string
	value?: number
	properties?: Record<string, any>
}

interface PageView {
	path: string
	title: string
	referrer?: string
	properties?: Record<string, any>
}

class Analytics {
	private static instance: Analytics
	private queue: Array<AnalyticsEvent | PageView> = []
	private isInitialized = false

	private constructor() {}

	static getInstance(): Analytics {
		if (!Analytics.instance) {
			Analytics.instance = new Analytics()
		}
		return Analytics.instance
	}

	initialize(): void {
		if (this.isInitialized) return

		// Initialize analytics providers here
		this.setupEventListeners()
		this.processQueue()
		this.isInitialized = true
	}

	private setupEventListeners(): void {
		// Track page views
		if (typeof window !== 'undefined') {
			window.addEventListener('popstate', () => {
				this.trackPageView()
			})
		}
	}

	private processQueue(): void {
		if (this.queue.length > 0) {
			// Process queued events
			this.queue.forEach((event) => {
				if ('category' in event) {
					this.sendEvent(event)
				} else {
					this.sendPageView(event)
				}
			})
			this.queue = []
		}
	}

	trackEvent(event: AnalyticsEvent): void {
		if (!this.isInitialized) {
			this.queue.push(event)
			return
		}
		this.sendEvent(event)
	}

	trackPageView(pageView: PageView): void {
		if (!this.isInitialized) {
			this.queue.push(pageView)
			return
		}
		this.sendPageView(pageView)
	}

	private sendEvent(event: AnalyticsEvent): void {
		// Implement event tracking logic here
		console.log('Analytics Event:', event)
	}

	private sendPageView(pageView: PageView): void {
		// Implement page view tracking logic here
		console.log('Page View:', pageView)
	}

	// Helper methods for common events
	trackConversionStart(format: string, fileSize: number): void {
		this.trackEvent({
			category: 'Conversion',
			action: 'Start',
			label: format,
			value: fileSize,
			properties: {
				format,
				fileSize
			}
		})
	}

	trackConversionComplete(format: string, duration: number): void {
		this.trackEvent({
			category: 'Conversion',
			action: 'Complete',
			label: format,
			value: duration,
			properties: {
				format,
				duration
			}
		})
	}

	trackConversionError(format: string, error: string): void {
		this.trackEvent({
			category: 'Conversion',
			action: 'Error',
			label: format,
			properties: {
				format,
				error
			}
		})
	}

	trackDownloadStart(fileSize: number): void {
		this.trackEvent({
			category: 'Download',
			action: 'Start',
			value: fileSize,
			properties: {
				fileSize
			}
		})
	}

	trackDownloadComplete(duration: number): void {
		this.trackEvent({
			category: 'Download',
			action: 'Complete',
			value: duration,
			properties: {
				duration
			}
		})
	}

	trackDownloadError(error: string): void {
		this.trackEvent({
			category: 'Download',
			action: 'Error',
			properties: {
				error
			}
		})
	}
}

export const analytics = Analytics.getInstance()

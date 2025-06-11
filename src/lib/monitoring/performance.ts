/**
 * Performance monitoring utilities
 *
 * Collects and reports Web Vitals metrics following best practices
 * https://web.dev/vitals/
 */

import { getErrorTracker } from './init'

/**
 * Layout shift entry type from Core Web Vitals
 */
interface LayoutShift extends PerformanceEntry {
	value: number
	hadRecentInput: boolean
}

/**
 * Core Web Vitals and other performance metrics
 */
interface PerformanceMetrics {
	fcp: number | null // First Contentful Paint
	lcp: number | null // Largest Contentful Paint
	fid: number | null // First Input Delay
	cls: number | null // Cumulative Layout Shift
	ttfb: number | null // Time To First Byte
	domLoad: number | null // DOM Content Loaded
	windowLoad: number | null // Window Load
}

/**
 * Thresholds for good performance according to Web Vitals
 */
const PERFORMANCE_THRESHOLDS = {
	FCP: 1800, // 1.8s (Good)
	LCP: 2500, // 2.5s (Good)
	FID: 100, // 100ms (Good)
	CLS: 0.1, // 0.1 (Good)
	TTFB: 800, // 800ms (Good)
	DOM_LOAD: 2500, // 2.5s
	WINDOW_LOAD: 4000 // 4s
}

/**
 * Current metrics values
 */
const metrics: PerformanceMetrics = {
	fcp: null,
	lcp: null,
	fid: null,
	cls: null,
	ttfb: null,
	domLoad: null,
	windowLoad: null
}

/**
 * Initialize and collect performance metrics
 */
export function measurePerformance(): void {
	if (typeof window === 'undefined' || !window.performance || !window.PerformanceObserver) {
		console.warn('Performance API not supported')
		return
	}

	try {
		// Basic page load metrics
		collectNavigationTiming()

		// Web Vitals metrics
		collectFirstContentfulPaint()
		collectLargestContentfulPaint()
		collectFirstInputDelay()
		collectCumulativeLayoutShift()

		// Page lifecycle events
		trackPageLifecycleEvents()
	} catch (error) {
		console.error('Error setting up performance monitoring:', error)
	}
}

/**
 * Collect navigation timing metrics (TTFB, DOM Load, Window Load)
 */
function collectNavigationTiming(): void {
	// Some metrics are available immediately
	const navigationEntry = performance.getEntriesByType(
		'navigation'
	)[0] as PerformanceNavigationTiming

	if (navigationEntry) {
		// Time To First Byte
		metrics.ttfb = navigationEntry.responseStart
		reportMetric('TTFB', navigationEntry.responseStart)

		// DOM Content Loaded
		const domLoad = navigationEntry.domContentLoadedEventEnd - navigationEntry.fetchStart
		metrics.domLoad = domLoad
		reportMetric('DOM_LOAD', domLoad)

		// Window Load Event
		const windowLoad = navigationEntry.loadEventEnd - navigationEntry.fetchStart
		if (windowLoad > 0) {
			// Sometimes loadEventEnd isn't available yet
			metrics.windowLoad = windowLoad
			reportMetric('WINDOW_LOAD', windowLoad)
		}
	}

	// For browsers that don't support navigation timing
	if (!navigationEntry) {
		// Fallback for DOM load
		if (document.readyState === 'complete') {
			const pageLoadTime = performance.now()
			metrics.domLoad = pageLoadTime
			reportMetric('DOM_LOAD', pageLoadTime)
		} else {
			window.addEventListener('DOMContentLoaded', () => {
				const pageLoadTime = performance.now()
				metrics.domLoad = pageLoadTime
				reportMetric('DOM_LOAD', pageLoadTime)
			})
		}
	}
}

/**
 * Collect First Contentful Paint metric
 */
function collectFirstContentfulPaint(): void {
	try {
		new PerformanceObserver((entryList) => {
			const entries = entryList.getEntries()
			if (entries.length > 0) {
				const fcp = entries[0]
				metrics.fcp = fcp.startTime
				reportMetric('FCP', fcp.startTime)
			}
		}).observe({ type: 'paint', buffered: true })
	} catch (error) {
		console.warn('FCP collection failed:', error)
	}
}

/**
 * Collect Largest Contentful Paint metric
 */
function collectLargestContentfulPaint(): void {
	try {
		new PerformanceObserver((entryList) => {
			const entries = entryList.getEntries()
			// We use the most recent LCP event
			const lastEntry = entries[entries.length - 1]
			metrics.lcp = lastEntry.startTime
			reportMetric('LCP', lastEntry.startTime)
		}).observe({ type: 'largest-contentful-paint', buffered: true })
	} catch (error) {
		console.warn('LCP collection failed:', error)
	}
}

/**
 * Collect First Input Delay metric
 */
function collectFirstInputDelay(): void {
	try {
		new PerformanceObserver((entryList) => {
			const entries = entryList.getEntries()
			entries.forEach((entry) => {
				const fidEntry = entry as PerformanceEventTiming
				const fid = fidEntry.processingStart - fidEntry.startTime
				metrics.fid = fid
				reportMetric('FID', fid)
			})
		}).observe({ type: 'first-input', buffered: true })
	} catch (error) {
		console.warn('FID collection failed:', error)
	}
}

/**
 * Collect Cumulative Layout Shift metric
 */
function collectCumulativeLayoutShift(): void {
	try {
		let clsValue = 0

		new PerformanceObserver((entryList) => {
			const entries = entryList.getEntries()
			entries.forEach((entry) => {
				const layoutShiftEntry = entry as LayoutShift
				// Only count layout shifts without recent user input
				if (!layoutShiftEntry.hadRecentInput) {
					clsValue += layoutShiftEntry.value
					metrics.cls = clsValue
					reportMetric('CLS', clsValue)
				}
			})
		}).observe({ type: 'layout-shift', buffered: true })
	} catch (error) {
		console.warn('CLS collection failed:', error)
	}
}

/**
 * Track page lifecycle events for more context
 */
function trackPageLifecycleEvents(): void {
	// Visibility change
	document.addEventListener('visibilitychange', () => {
		const visibility = document.visibilityState
		reportPageLifecycleEvent('visibilitychange', { state: visibility })
	})

	// Page unload
	window.addEventListener('beforeunload', () => {
		reportPageLifecycleEvent('beforeunload', {
			timeOnPage: Math.floor(performance.now())
		})

		// Only try to send metrics in production
		if (import.meta.env.PROD && navigator.sendBeacon) {
			// Get API URL from environment or use default
			const apiBase = import.meta.env.PUBLIC_API_URL || ''

			const metricsData = new Blob(
				[
					JSON.stringify({
						metrics,
						timestamp: new Date().toISOString(),
						userAgent: navigator.userAgent,
						url: window.location.href
					})
				],
				{
					type: 'application/json'
				}
			)

			// Don't send metrics in development to avoid 500 errors
			// In production, use the proper API endpoint
			navigator.sendBeacon(`${apiBase}/metrics`, metricsData)
		}
	})
}

/**
 * Report a page lifecycle event
 */
function reportPageLifecycleEvent(event: string, data: Record<string, any>): void {
	if (import.meta.env.DEV) {
		console.log(`Page lifecycle: ${event}`, data)
	}

	// In production, send to monitoring system
	if (import.meta.env.PROD) {
		getErrorTracker().setTag(`page.${event}`, JSON.stringify(data))
	}
}

/**
 * Report a performance metric
 */
function reportMetric(name: keyof typeof PERFORMANCE_THRESHOLDS, value: number): void {
	const threshold = PERFORMANCE_THRESHOLDS[name]
	const isGood = value <= threshold
	const valueFormatted = value.toFixed(2)

	// Log to console in development
	if (import.meta.env.DEV) {
		console.log(
			`%c${name}: ${valueFormatted}ms ${isGood ? '✅' : '❌'}`,
			`color: ${isGood ? 'green' : 'red'}`
		)
	}

	// Send to monitoring in production
	if (import.meta.env.PROD) {
		getErrorTracker().setTag(`perf.${name.toLowerCase()}`, valueFormatted)

		// Report poor performance as an issue
		if (!isGood) {
			getErrorTracker().captureMessage(
				`Poor performance detected: ${name} = ${valueFormatted}ms (threshold: ${threshold}ms)`,
				'warning'
			)
		}
	}
}

/**
 * Get current performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetrics {
	return { ...metrics }
}

/**
 * Performance monitoring utilities
 */

interface PerformanceMetric {
	name: string
	value: number
	rating: 'good' | 'needs-improvement' | 'poor'
}

interface PerformanceData {
	metrics: PerformanceMetric[]
	timestamp: number
}

class PerformanceMonitor {
	private static instance: PerformanceMonitor
	private metrics: Map<string, PerformanceData> = new Map()
	private observers: Set<(data: PerformanceData) => void> = new Set()

	private constructor() {
		if (typeof window !== 'undefined') {
			this.initializeObservers()
		}
	}

	public static getInstance(): PerformanceMonitor {
		if (!PerformanceMonitor.instance) {
			PerformanceMonitor.instance = new PerformanceMonitor()
		}
		return PerformanceMonitor.instance
	}

	private initializeObservers() {
		// Observe Largest Contentful Paint (LCP)
		new PerformanceObserver((entryList) => {
			const entries = entryList.getEntries()
			const lastEntry = entries[entries.length - 1]
			this.recordMetric('lcp', lastEntry.startTime)
		}).observe({ entryTypes: ['largest-contentful-paint'] })

		// Observe First Input Delay (FID)
		new PerformanceObserver((entryList) => {
			const entries = entryList.getEntries()
			entries.forEach((entry) => {
				this.recordMetric('fid', entry.processingStart - entry.startTime)
			})
		}).observe({ entryTypes: ['first-input'] })

		// Observe Cumulative Layout Shift (CLS)
		new PerformanceObserver((entryList) => {
			let clsValue = 0
			const entries = entryList.getEntries()
			entries.forEach((entry) => {
				if (!entry.hadRecentInput) {
					clsValue += entry.value
				}
			})
			this.recordMetric('cls', clsValue)
		}).observe({ entryTypes: ['layout-shift'] })
	}

	private getRating(value: number, metric: string): 'good' | 'needs-improvement' | 'poor' {
		const thresholds = {
			lcp: { good: 2500, poor: 4000 },
			fid: { good: 100, poor: 300 },
			cls: { good: 0.1, poor: 0.25 }
		}

		const threshold = thresholds[metric as keyof typeof thresholds]
		if (!threshold) return 'good'

		if (value <= threshold.good) return 'good'
		if (value <= threshold.poor) return 'needs-improvement'
		return 'poor'
	}

	public recordMetric(name: string, value: number) {
		const metric: PerformanceMetric = {
			name,
			value,
			rating: this.getRating(value, name)
		}

		const data: PerformanceData = {
			metrics: [metric],
			timestamp: Date.now()
		}

		this.metrics.set(name, data)
		this.notifyObservers(data)
	}

	public getMetrics(): Map<string, PerformanceData> {
		return this.metrics
	}

	public subscribe(callback: (data: PerformanceData) => void) {
		this.observers.add(callback)
		return () => this.observers.delete(callback)
	}

	private notifyObservers(data: PerformanceData) {
		this.observers.forEach((observer) => observer(data))
	}

	public async measurePageLoad() {
		if (typeof window === 'undefined') return

		const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
		if (!navigation) return

		const metrics = [
			{
				name: 'ttfb',
				value: navigation.responseStart - navigation.requestStart
			},
			{
				name: 'fcp',
				value: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
			},
			{
				name: 'dom',
				value: navigation.domContentLoadedEventEnd - navigation.navigationStart
			},
			{
				name: 'load',
				value: navigation.loadEventEnd - navigation.navigationStart
			}
		]

		metrics.forEach(({ name, value }) => {
			this.recordMetric(name, value)
		})
	}
}

export const performanceMonitor = PerformanceMonitor.getInstance()

// Utility functions for measuring specific operations
export const measureOperation = async <T>(
	name: string,
	operation: () => Promise<T>
): Promise<T> => {
	const start = performance.now()
	try {
		return await operation()
	} finally {
		const duration = performance.now() - start
		performanceMonitor.recordMetric(name, duration)
	}
}

export const measureSync = <T>(name: string, operation: () => T): T => {
	const start = performance.now()
	try {
		return operation()
	} finally {
		const duration = performance.now() - start
		performanceMonitor.recordMetric(name, duration)
	}
}

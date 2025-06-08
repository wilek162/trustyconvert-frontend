// src/lib/monitoring/performance.ts

// Performance metric types
interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

interface PerformanceMetrics {
  fcp: number | null;
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  ttfb: number | null;
}

const metrics: PerformanceMetrics = {
  fcp: null,
  lcp: null,
  fid: null,
  cls: null,
  ttfb: null,
};

const PERFORMANCE_THRESHOLDS = {
  FCP: 1500, // 1.5s
  LCP: 2500, // 2.5s
  FID: 100, // 100ms
  CLS: 0.1, // 0.1
  TTFB: 600, // 600ms
};

export function measurePerformance() {
  if (!window.performance || !PerformanceObserver) {
    console.warn("Performance API not supported");
    return;
  }

  // First Contentful Paint
  new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    if (entries.length > 0) {
      const fcp = entries[0];
      metrics.fcp = fcp.startTime;
      reportMetric("FCP", fcp.startTime);
    }
  }).observe({ entryTypes: ["paint"] });

  // Largest Contentful Paint
  new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    const lastEntry = entries[entries.length - 1];
    metrics.lcp = lastEntry.startTime;
    reportMetric("LCP", lastEntry.startTime);
  }).observe({ entryTypes: ["largest-contentful-paint"] });

  // First Input Delay
  new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    entries.forEach((entry) => {
      const fidEntry = entry as PerformanceEventTiming;
      metrics.fid = fidEntry.processingStart - fidEntry.startTime;
      reportMetric("FID", metrics.fid);
    });
  }).observe({ entryTypes: ["first-input"] });

  // Cumulative Layout Shift
  new PerformanceObserver((entryList) => {
    let clsValue = 0;
    const entries = entryList.getEntries();
    entries.forEach((entry) => {
      const layoutShiftEntry = entry as LayoutShift;
      if (!layoutShiftEntry.hadRecentInput) {
        clsValue += layoutShiftEntry.value;
      }
    });
    metrics.cls = clsValue;
    reportMetric("CLS", clsValue);
  }).observe({ entryTypes: ["layout-shift"] });

  // Time to First Byte
  const navigationEntry = performance.getEntriesByType(
    "navigation"
  )[0] as PerformanceNavigationTiming;
  if (navigationEntry) {
    metrics.ttfb = navigationEntry.responseStart;
    reportMetric("TTFB", navigationEntry.responseStart);
  }
}

function reportMetric(
  name: keyof typeof PERFORMANCE_THRESHOLDS,
  value: number
) {
  const threshold = PERFORMANCE_THRESHOLDS[name];
  const isGood = value <= threshold;

  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log(
      `%c${name}: ${value.toFixed(2)} ${isGood ? "✅" : "❌"}`,
      `color: ${isGood ? "green" : "red"}`
    );
  }

  // Send to analytics in production
  if (process.env.NODE_ENV === "production") {
    // TODO: Send to your analytics service
    // Example: sendToAnalytics(name, value);
  }
}

export function getPerformanceMetrics(): PerformanceMetrics {
  return { ...metrics };
}

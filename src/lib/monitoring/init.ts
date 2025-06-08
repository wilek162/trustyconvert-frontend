import * as Sentry from "@sentry/browser";

import { measurePerformance } from "./performance";

export function initializeMonitoring() {
  // Initialize Sentry in production
  if (process.env.NODE_ENV === "production") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      integrations: [
        new Sentry.BrowserTracing({
          tracePropagationTargets: ["localhost", "trustyconvert.com"],
        }),
      ],
    });
  }

  // Initialize performance monitoring
  if (typeof window !== "undefined") {
    measurePerformance();
  }
}

// Initialize MSW in development
export async function initializeMocks() {
  if (process.env.NODE_ENV === "development") {
    const { worker } = await import("../../mocks/browser");
    return worker.start({
      onUnhandledRequest: "bypass",
    });
  }
}

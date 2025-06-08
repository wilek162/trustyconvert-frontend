// src/lib/monitoring/errorTracking.ts
import * as Sentry from "@sentry/browser";

export const initErrorTracking = () => {
  if (process.env.NODE_ENV === "production") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
      integrations: [new Sentry.BrowserTracing()],
    });
  }
};

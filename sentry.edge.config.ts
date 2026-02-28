// This file configures the initialization of Sentry for edge features (middleware, edge routes, etc).
// The config you add here will be used whenever one of the edge features is loaded.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { init } from "@sentry/nextjs";
import type { EdgeOptions } from "@sentry/nextjs";
import {
  beforeSendEdge,
  beforeSendMetric,
  SENTRY_IGNORE_ERRORS,
} from "@utils/sentry-helpers";

if (process.env.NODE_ENV === "production") {
  const config: EdgeOptions = {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV,
    // Release tracking: associate errors with deployments
    // Vercel automatically provides VERCEL_GIT_COMMIT_SHA
    release:
      process.env.SENTRY_RELEASE ||
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
      undefined,
    // Errors-only: disable performance tracing.
    tracesSampleRate: 0,
    // Privacy: explicitly disable sending PII by default
    sendDefaultPii: false,
    debug: false,
    // SDK-level filtering: drop well-known noise before serialization (more performant than beforeSend)
    ignoreErrors: SENTRY_IGNORE_ERRORS,
    // Errors-only: do not send console logs as Sentry logs.
    enableLogs: false,
    // Metrics: automatically enabled in v10.25.0+ (no explicit enableMetrics needed)
    // Use Sentry.metrics.count(), Sentry.metrics.gauge(), Sentry.metrics.distribution()
    // Filter and sanitize metrics before sending (removes sensitive data from attributes)
    beforeSendMetric,
    // Filter and sanitize events before sending (removes sensitive data, filters non-critical errors)
    beforeSend: beforeSendEdge,
  };

  init(config);
}

// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import {
  init,
  addIntegration,
  captureRouterTransitionStart,
} from "@sentry/nextjs";
import type { BrowserOptions } from "@sentry/nextjs";
import {
  beforeSendClient,
  beforeSendMetric,
  SENTRY_IGNORE_ERRORS,
  SENTRY_DENY_URLS,
} from "@utils/sentry-helpers";

const sentryClientConfig = {
  // Add your Sentry client config here
};

if (process.env.NODE_ENV === "production") {
  const config: BrowserOptions = {
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

    // Session replay: only capture replays when an error occurs.
    // This keeps debugging capability without ingesting baseline session replays.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    // Privacy: explicitly disable sending PII by default
    sendDefaultPii: false,
    debug: false,
    // SDK-level filtering: drop well-known noise before serialization (more performant than beforeSend)
    ignoreErrors: SENTRY_IGNORE_ERRORS,
    // Don't report errors from browser extension scripts
    denyUrls: SENTRY_DENY_URLS,
    // Session Replay is lazy-loaded below for smaller initial bundle (~60KB savings)
    integrations: [],
    // Errors-only: do not send console logs as Sentry logs.
    enableLogs: false,
    // Metrics: automatically enabled in v10.25.0+ (no explicit enableMetrics needed)
    // Use Sentry.metrics.count(), Sentry.metrics.gauge(), Sentry.metrics.distribution()
    // Filter and sanitize metrics before sending (removes sensitive data from attributes)
    beforeSendMetric,
    // Filter and sanitize events before sending (removes sensitive data, filters non-critical errors)
    beforeSend: beforeSendClient,
  };

  init(config);

  // Lazy-load Session Replay to reduce initial bundle size (~60KB savings)
  // Replay is only loaded when needed (replaysOnErrorSampleRate: 1.0)
  import("@sentry/nextjs").then((lazyLoadedSentry) => {
    addIntegration(
      lazyLoadedSentry.replayIntegration({
        // Privacy defaults: avoid capturing typed content.
        maskAllText: true,
        blockAllMedia: false,
      }),
    );
  });
}

// Export router transition tracking for Next.js App Router navigation monitoring
// This enables automatic tracking of route changes and performance
export const onRouterTransitionStart = captureRouterTransitionStart;

export default sentryClientConfig;

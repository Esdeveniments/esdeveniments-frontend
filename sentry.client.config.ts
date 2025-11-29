// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { init, consoleLoggingIntegration, replayIntegration, captureRouterTransitionStart } from "@sentry/nextjs";
import type { BrowserOptions } from "@sentry/nextjs";
import { beforeSendClient } from "@utils/sentry-helpers";

const sentryClientConfig = {
  // Add your Sentry client config here
};

if (process.env.NODE_ENV === "production") {
  const config: BrowserOptions = {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV,
    // Release tracking: associate errors with deployments
    // Vercel automatically provides VERCEL_GIT_COMMIT_SHA
    release: process.env.SENTRY_RELEASE || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || undefined,
    // Performance monitoring: 10% sample rate for production (reduced from 100% to minimize overhead)
    tracesSampleRate: 0.1,
    // Session replay: capture 100% of error sessions, 10% of normal sessions
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    // Privacy: explicitly disable sending PII by default
    sendDefaultPii: false,
    debug: false,
    integrations: [
      // send console.log, console.warn, and console.error calls as logs to Sentry
      consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
      // Session Replay: required integration for replay to work
      replayIntegration({
        // Mask all text content and user input for privacy
        maskAllText: true,
        blockAllMedia: false,
      }),
    ],
    // Enable logs to be sent to Sentry
    enableLogs: true,
    // Filter and sanitize events before sending (removes sensitive data, filters non-critical errors)
    beforeSend: beforeSendClient,
  };

  init(config);
}

// Export router transition tracking for Next.js App Router navigation monitoring
// This enables automatic tracking of route changes and performance
export const onRouterTransitionStart = captureRouterTransitionStart;

export default sentryClientConfig;

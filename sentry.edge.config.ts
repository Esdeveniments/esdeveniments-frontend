// This file configures the initialization of Sentry for edge features (middleware, edge routes, etc).
// The config you add here will be used whenever one of the edge features is loaded.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { init, consoleLoggingIntegration } from "@sentry/nextjs";
import type { EdgeOptions } from "@sentry/nextjs";
import { beforeSendEdge } from "@utils/sentry-helpers";

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
    // Performance monitoring: 10% sample rate for production (reduced from 100% to minimize overhead)
    tracesSampleRate: 0.1,
    // Privacy: explicitly disable sending PII by default
    sendDefaultPii: false,
    debug: false,
    integrations: [
      // send console.log, console.warn, and console.error calls as logs to Sentry
      consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
    ],
    // Enable logs to be sent to Sentry
    enableLogs: true,
    // Filter and sanitize events before sending (removes sensitive data, filters non-critical errors)
    beforeSend: beforeSendEdge,
  };

  init(config);
}

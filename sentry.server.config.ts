// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever a page is built on the server or SSR is used.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { init, consoleLoggingIntegration } from "@sentry/nextjs";
import type { NodeOptions } from "@sentry/nextjs";
import { beforeSendServer } from "@utils/sentry-helpers";

if (process.env.NODE_ENV === "production") {
  const config: NodeOptions = {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV,
    // Release tracking: associate errors with deployments
    // Vercel automatically provides VERCEL_GIT_COMMIT_SHA
    release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA || undefined,
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
    beforeSend: beforeSendServer,
  };

  init(config);
}

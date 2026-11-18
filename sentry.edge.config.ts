// This file configures the initialization of Sentry for edge features (middleware, edge routes, etc).
// The config you add here will be used whenever one of the edge features is loaded.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { init } from "@sentry/nextjs";
import type { EdgeOptions } from "@sentry/nextjs";
import {
  beforeSendEdge,
  SENTRY_DATA_COLLECTION,
  SENTRY_IGNORE_ERRORS,
  sentryEnvironment,
} from "@utils/sentry-helpers";

const environment = sentryEnvironment();

// Only our production and staging builds report (see sentryEnvironment).
if (process.env.NODE_ENV === "production" && environment !== "preview") {
  const config: EdgeOptions = {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment,
    // Release tracking: associate errors with deployments
    // Vercel automatically provides VERCEL_GIT_COMMIT_SHA
    release:
      process.env.SENTRY_RELEASE ||
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
      undefined,
    // Errors-only: disable performance tracing.
    tracesSampleRate: 0,
    // Privacy: keep the v10 no-PII baseline (v11 default collects more)
    dataCollection: SENTRY_DATA_COLLECTION,
    debug: false,
    // SDK-level filtering: drop well-known noise before serialization (more performant than beforeSend)
    ignoreErrors: SENTRY_IGNORE_ERRORS,
    // Filter and sanitize events before sending (removes sensitive data, filters non-critical errors)
    beforeSend: beforeSendEdge,
  };

  init(config);
}

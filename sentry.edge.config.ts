// This file configures the initialization of Sentry for edge features (middleware, edge routes, etc).
// The config you add here will be used whenever one of the edge features is loaded.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { init } from "@sentry/nextjs";
import type { EdgeOptions } from "@sentry/nextjs";
import {
  beforeSendEdge,
  SENTRY_DATA_COLLECTION,
  SENTRY_IGNORE_ERRORS,
} from "@utils/sentry-helpers";

if (process.env.NODE_ENV === "production") {
  const config: EdgeOptions = {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    // Release tracking: associate errors with deployments
    release: process.env.SENTRY_RELEASE || undefined,
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

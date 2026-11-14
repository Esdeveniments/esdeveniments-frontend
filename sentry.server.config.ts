// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever a page is built on the server or SSR is used.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { init } from "@sentry/nextjs";
import type { NodeOptions } from "@sentry/nextjs";
import {
  beforeSendServer,
  SENTRY_DATA_COLLECTION,
  SENTRY_IGNORE_ERRORS,
} from "@utils/sentry-helpers";

if (process.env.NODE_ENV === "production") {
  const config: NodeOptions = {
    dsn: process.env.SENTRY_DSN,
    // Release tracking: associate errors with deployments
    release: process.env.SENTRY_RELEASE || undefined,
    // Errors-only: disable performance tracing.
    tracesSampleRate: 0,
    // Skip OpenTelemetry setup: OTel's trace context propagation calls crypto.randomUUID()
    // during server render, which is incompatible with Next.js 16 cacheComponents.
    // Since tracesSampleRate is 0, we don't need OTel. Error capture still works without it.
    enableOpenTelemetrySetup: false,
    // Privacy: keep the v10 no-PII baseline (v11 default collects more)
    dataCollection: SENTRY_DATA_COLLECTION,
    debug: false,
    // SDK-level filtering: drop well-known noise before serialization (more performant than beforeSend)
    ignoreErrors: SENTRY_IGNORE_ERRORS,
    // Filter and sanitize events before sending (removes sensitive data, filters non-critical errors)
    beforeSend: beforeSendServer,
  };

  init(config);
}

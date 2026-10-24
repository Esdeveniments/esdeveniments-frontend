// Browser Sentry. Turbopack loads only this file: it ignores
// sentry.client.config.ts, so an init there never ran and browser errors went
// unreported.

import { init } from "@sentry/nextjs";
import {
  beforeSendClient,
  SENTRY_IGNORE_ERRORS,
  SENTRY_DENY_URLS,
} from "@utils/sentry-helpers";

if (process.env.NODE_ENV === "production") {
  init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV,
    release:
      process.env.SENTRY_RELEASE ||
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
      undefined,
    // Errors only: no tracing (stripped by compiler.define in next.config.js),
    // no Session Replay.
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
    debug: false,
    ignoreErrors: SENTRY_IGNORE_ERRORS,
    denyUrls: SENTRY_DENY_URLS,
    enableLogs: false,
    beforeSend: beforeSendClient,
  });
}

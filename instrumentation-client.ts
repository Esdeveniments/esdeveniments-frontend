// Browser Sentry. Turbopack loads only this file: it ignores
// sentry.client.config.ts, so an init there never ran and browser errors went
// unreported.
//
// Errors only. A hand-built BrowserClient instead of init() keeps the React and
// Next.js wrappers, tracing and Session Replay out of the boot chunk (see the
// Sentry tree-shaking docs). withSentryConfig inlines the release (the one the
// source maps use) and the tunnelRoute path; init() would apply both itself.

import {
  BrowserClient,
  breadcrumbsIntegration,
  dedupeIntegration,
  defaultStackParser,
  eventFiltersIntegration,
  functionToStringIntegration,
  getCurrentScope,
  globalHandlersIntegration,
  httpContextIntegration,
  linkedErrorsIntegration,
  makeFetchTransport,
} from "@sentry/nextjs";
import {
  beforeSendClient,
  SENTRY_IGNORE_ERRORS,
  SENTRY_DENY_URLS,
  sentryTunnelFor,
} from "@utils/sentry-helpers";

if (process.env.NODE_ENV === "production") {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  const client = new BrowserClient({
    dsn,
    tunnel: sentryTunnelFor(dsn, process.env._sentryRewritesTunnelPath),
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV,
    release: process.env._sentryRelease,
    transport: makeFetchTransport,
    stackParser: defaultStackParser,
    integrations: [
      // ignoreErrors and denyUrls only work through this integration.
      eventFiltersIntegration(),
      functionToStringIntegration(),
      breadcrumbsIntegration(),
      globalHandlersIntegration(),
      linkedErrorsIntegration(),
      dedupeIntegration(),
      httpContextIntegration(),
    ],
    sendDefaultPii: false,
    ignoreErrors: SENTRY_IGNORE_ERRORS,
    denyUrls: SENTRY_DENY_URLS,
    beforeSend: beforeSendClient,
  });
  getCurrentScope().setClient(client);
  client.init();
}

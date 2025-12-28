// Client instrumentation hook for Next.js App Router.
// Sentry initialization is handled by `sentry.client.config.ts`.

import { captureRouterTransitionStart } from "@sentry/nextjs";

export const onRouterTransitionStart = captureRouterTransitionStart;

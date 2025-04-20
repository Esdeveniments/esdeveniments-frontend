// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever a page is built on the server or SSR is used.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { init } from '@sentry/nextjs';
import type { NodeOptions } from '@sentry/nextjs';

if (process.env.NODE_ENV === 'production') {
  const config: NodeOptions = {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV,
    tracesSampleRate: 1.0,
    debug: false,
  };

  init(config);
}

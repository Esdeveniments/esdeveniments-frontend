// This file configures the initialization of Sentry for edge features (middleware, edge routes, etc).
// The config you add here will be used whenever one of the edge features is loaded.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { init } from '@sentry/nextjs';
import type { EdgeOptions } from '@sentry/nextjs';

if (process.env.NODE_ENV === 'production') {
  const config: EdgeOptions = {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DNS,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV,
    tracesSampleRate: 1.0,
    debug: false,
  };

  init(config);
}

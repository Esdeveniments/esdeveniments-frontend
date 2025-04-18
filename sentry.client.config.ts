// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { init } from '@sentry/nextjs';
import type { BrowserOptions } from '@sentry/nextjs';

const sentryClientConfig = {
  // Add your Sentry client config here
};

if (process.env.NODE_ENV === 'production') {
  const config: BrowserOptions = {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DNS,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV,
    tracesSampleRate: 1.0,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    debug: false,
  };

  init(config);
}

export default sentryClientConfig;

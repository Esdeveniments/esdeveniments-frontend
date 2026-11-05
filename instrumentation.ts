import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
    // Not during `next build`: what Next prerenders must not depend on a
    // warm cache (AGENTS.md › Hard rules).
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
      const { warmReferenceCaches } = await import(
        './lib/api/warm-reference-caches'
      );
      await warmReferenceCaches();
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;

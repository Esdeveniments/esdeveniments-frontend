import { PHASE_PRODUCTION_BUILD } from "next/constants";

/**
 * Detects if the application is in build phase (SSG/static generation).
 * During build phase, we bypass internal API proxy and call external API directly
 * to avoid issues when the Next.js server isn't running.
 *
 * This is used to determine whether to use internal API routes (runtime) or
 * external API calls (build time) for data fetching.
 *
 * NEXT_PHASE is the only reliable signal — it's set by the Next.js CLI itself
 * during `next build`, regardless of hosting platform. A `NODE_ENV ===
 * "production" && !VERCEL_URL` fallback used to be OR'd in here, added when
 * this app only ran on Vercel (VERCEL_URL is always set at Vercel runtime, so
 * its absence meant "must be the build step"). Since the Coolify migration,
 * that assumption is false: self-hosted production never sets VERCEL_URL
 * either, so the fallback made isBuildPhase permanently true at runtime,
 * silently bypassing the internal API's caching/revalidation for places,
 * regions, cities, categories, and events on every production request.
 *
 * Lives in its own module (not utils/constants.ts) so the API data-fetching
 * layer (lib/api/regions.ts, cities.ts, places.ts, events.ts, categories.ts)
 * doesn't transitively pull in next-intl/server and the full ca/es/en message
 * bundles just to read one boolean flag.
 */
export const isBuildPhase = process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD;

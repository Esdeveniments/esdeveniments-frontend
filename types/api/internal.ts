/**
 * Options for server readers in `lib/api/*.ts`.
 */
export interface ServerReaderOptions {
  /**
   * Re-throw on transient fetch failures (network error / non-404 HTTP error)
   * instead of returning `null`. Set by cached metadata/page readers so a
   * transient error is never cached as a missing-entity `null` for the
   * cacheLife window (a genuine 404 still returns `null`, which is safe to cache).
   */
  throwOnError?: boolean;
  /**
   * Skip calling Next's `connection()` (required inside `"use cache"` and
   * startup warm-up, where `connection()` throws).
   */
  skipConnection?: boolean;
}

/**
 * Options for external detail-by-slug fetchers (`lib/api/detail-external.ts`,
 * `events-external.ts`, `news-external.ts`).
 */
export interface DetailFetchOptions {
  signal?: AbortSignal | null;
  skipConnection?: boolean;
}

/**
 * Options for internal API readers that can resolve the API origin from
 * configuration instead of the request `headers()`.
 *
 * Set `preferConfiguredOrigin: true` in request-independent contexts (e.g.
 * `generateMetadata`) so the read stays prerenderable under `cacheComponents` —
 * reading `headers()` there makes metadata dynamic and breaks PPR.
 */
export interface InternalOriginOptions {
  preferConfiguredOrigin?: boolean;
  /**
   * Re-throw on transient fetch failures (network error / non-404 HTTP error)
   * instead of returning `null`. Set by cached metadata readers so a transient
   * error is never cached as a missing-metadata `null` for the cacheLife window
   * (a genuine 404 still returns `null`, which is safe to cache).
   */
  throwOnError?: boolean;
}

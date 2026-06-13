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
}

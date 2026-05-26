/**
 * Production hostname allowlist for indexing decisions.
 *
 * Default-deny model: any host NOT in this list is treated as non-production
 * (staging, PR previews, local dev, accidental subdomains) and emits
 * `noindex, nofollow` headers + meta tags.
 *
 * Why a substring check (e.g. `host.includes("staging.")`) is not enough:
 * Coolify's PR-preview URL template is configurable. If someone reverts it
 * from `pr-{{pr_id}}.{{domain}}` to the default `{{pr_id}}.{{domain}}`, a
 * `pr-` substring check silently stops matching and previews leak into Google.
 *
 * KEEP IN SYNC WITH `scripts/generate-robots.mjs` (build-time copy).
 */
export const PRODUCTION_HOSTS: ReadonlySet<string> = new Set([
  "www.esdeveniments.cat",
  "esdeveniments.cat",
]);

/** Strips port (`:3000`) and lowercases a `Host` header value. */
function normalizeHost(host: string): string {
  return host.toLowerCase().split(":")[0] ?? "";
}

/**
 * Returns true when the given host header value matches the production
 * allowlist. Any unknown / empty host is treated as non-production.
 */
export function isProductionHost(host: string | null | undefined): boolean {
  if (!host) return false;
  return PRODUCTION_HOSTS.has(normalizeHost(host));
}

/**
 * Returns true when the given site URL (e.g. `NEXT_PUBLIC_SITE_URL`) points
 * at a production host. Used at build time and in metadata generation, where
 * only the URL string is available (no `Host` header).
 */
export function isProductionSiteUrl(siteUrl: string | undefined): boolean {
  if (!siteUrl) return false;
  try {
    return PRODUCTION_HOSTS.has(new URL(siteUrl).hostname.toLowerCase());
  } catch {
    return false;
  }
}

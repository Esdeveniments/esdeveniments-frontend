/** What to purge from Cloudflare's cache (one `purge_cache` request body). */
export type CloudflarePurgeTarget =
  | { purgeEverything: true }
  | { prefixes: string[] }
  | { tags: string[] };

export interface CloudflarePurgeOutcome {
  success: boolean;
  /** True when Cloudflare isn't configured or there was nothing to purge. */
  skipped?: boolean;
  error?: string;
}

/** Zone and API token for purge_cache requests (lib/cdn/cloudflare-config.ts). */
export interface CloudflarePurgeConfig {
  zoneId: string;
  apiToken: string;
}

/** Page kinds labelled with a Cloudflare Cache-Tag (lib/cdn/cache-tags.ts). */
export type CdnTagKind = "html" | "home" | "place" | "event" | "user";

/**
 * The event fields that decide which CDN-cached pages show an event: its own
 * page, its city/region/province listings and its owner's profile.
 */
export interface EventCdnScope {
  slug?: string;
  city?: { slug?: string } | null;
  region?: { slug?: string } | null;
  province?: { slug?: string } | null;
  owner?: { username?: string } | null;
}

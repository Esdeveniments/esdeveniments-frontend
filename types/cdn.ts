import type { EventDetailResponseDTO } from "types/api/event";

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

/**
 * The event fields that decide which CDN-cached pages show an event: its own
 * page, its city/region/province listings and its owner's profile.
 */
export type EventCdnScope = Partial<
  Pick<EventDetailResponseDTO, "slug" | "city" | "region" | "province" | "owner">
>;

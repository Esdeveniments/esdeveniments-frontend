/**
 * Cloudflare `Cache-Tag` values for public HTML. proxy.ts labels each
 * CDN-cacheable page; lib/cdn/cloudflare-purge.ts purges the same labels when
 * an event changes. Both sides must build tags here so they always match.
 *
 * Format: `<host>:<kind>[:<value>]`. The host prefix keeps a staging purge
 * from clearing production pages: cache purges are zone-wide and every
 * environment shares the esdeveniments.cat zone.
 */
import { normalizeHost } from "@utils/host-validation";
import { shortTagHash } from "@lib/cache/tags";
import type { EventCdnScope } from "types/cdn";

/** The Catalonia listing shows events from every place. */
const CATALONIA_PLACE_SLUG = "catalunya";

// Cloudflare tags are case-insensitive printable ASCII without spaces or
// commas, max 1,024 chars per purge. Slugs are already in this charset; any
// other value (or an oversized one) is hashed so both sides still agree.
const SAFE_TAG_VALUE = /^[a-z0-9._~-]+$/;
const MAX_TAG_VALUE_LENGTH = 200;

function tagValue(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (
    normalized.length <= MAX_TAG_VALUE_LENGTH &&
    SAFE_TAG_VALUE.test(normalized)
  ) {
    return normalized;
  }
  return `h-${shortTagHash(normalized)}`;
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** Lowercased hostname without port, or "" when the input is unusable. */
export function cdnHost(host: string | null | undefined): string {
  return host ? normalizeHost(host) : "";
}

export function cdnTag(
  host: string,
  kind: "html" | "home" | "place" | "event" | "user",
  value?: string,
): string {
  return value === undefined
    ? `${host}:${kind}`
    : `${host}:${kind}:${tagValue(value)}`;
}

/**
 * Tags for a public HTML response. `segments` is the locale-less path split
 * on "/" (still URL-encoded); `isPlacePath` is proxy.ts's own place check, so
 * the place is read exactly as the place routes read it. Every page also gets
 * the `<host>:html` tag, used to clear all HTML at once.
 */
export function buildPageCdnTags(
  rawHost: string | null | undefined,
  segments: readonly string[],
  isPlacePath: boolean,
): string[] {
  const host = cdnHost(rawHost);
  if (!host) return [];

  const tags = [cdnTag(host, "html")];
  const [first, second] = segments;
  if (segments.length === 0) {
    tags.push(cdnTag(host, "home"));
  } else if (isPlacePath && first) {
    tags.push(cdnTag(host, "place", decodeSegment(first)));
  } else if (segments.length === 2 && first === "e" && second) {
    tags.push(cdnTag(host, "event", decodeSegment(second)));
  } else if (segments.length === 2 && first === "perfil" && second) {
    tags.push(cdnTag(host, "user", decodeSegment(second)));
  }
  return tags;
}

/**
 * Tags for every CDN-cached page that can list the given events: home,
 * Catalonia, each city/region/province listing, the event page and the
 * owner's profile. Pass the old and new event on edit.
 */
export function buildEventCdnTags(
  rawHost: string | null | undefined,
  events: readonly (EventCdnScope | null | undefined)[],
): string[] {
  const host = cdnHost(rawHost);
  if (!host) return [];

  const tags = new Set([
    cdnTag(host, "home"),
    cdnTag(host, "place", CATALONIA_PLACE_SLUG),
  ]);
  for (const event of events) {
    if (!event) continue;
    for (const place of [event.city, event.region, event.province]) {
      if (place?.slug) tags.add(cdnTag(host, "place", place.slug));
    }
    if (event.slug) tags.add(cdnTag(host, "event", event.slug));
    if (event.owner?.username) {
      tags.add(cdnTag(host, "user", event.owner.username));
    }
  }
  return [...tags];
}

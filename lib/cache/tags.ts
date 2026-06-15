/**
 * Cache tag helpers for Next.js 16 tag-based caching
 * Provides type-safe tag builders and constants
 */
import type { CacheTag } from "types/cache";

/** Next.js rejects cache tags longer than 256 characters. */
const MAX_TAG_LENGTH = 256;

/** Stable, non-cryptographic short hash (djb2) used to shorten oversized tags. */
function shortTagHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * Build a `<prefix>:<value>` tag that always fits Next.js's 256-char limit.
 * Oversized values (e.g. a malformed event id that carries a whole URL +
 * description from a bad RSS parse) are truncated with a stable hash suffix, so
 * the tag stays unique and identical across the fetch (set) and the
 * updateTag/revalidateTag (invalidate) paths. Short values pass through verbatim.
 */
function boundedTag<Prefix extends string>(
  prefix: Prefix,
  value: string,
): `${Prefix}:${string}` {
  const tag = `${prefix}:${value}`;
  if (tag.length <= MAX_TAG_LENGTH) return tag as `${Prefix}:${string}`;
  const hash = shortTagHash(value);
  // Reserve room for the ":" separator and the "-<hash>" suffix.
  const keep = MAX_TAG_LENGTH - prefix.length - 2 - hash.length;
  return `${prefix}:${value.slice(0, Math.max(0, keep))}-${hash}` as `${Prefix}:${string}`;
}

// Event tags
export const eventsTag = "events" as const satisfies CacheTag;
export const eventsCategorizedTag = "events:categorized" as const satisfies CacheTag;
export const eventTag = (slug: string): `event:${string}` =>
  boundedTag("event", slug);

// Place tags
export const placesTag = "places" as const satisfies CacheTag;
export const placeTag = (slug: string): `place:${string}` =>
  boundedTag("place", slug);

// City tags
export const citiesTag = "cities" as const satisfies CacheTag;
export const cityTag = (id: string | number): `city:${string}` =>
  `city:${String(id)}` as const;

// Region tags
export const regionsTag = "regions" as const satisfies CacheTag;
export const regionsOptionsTag = "regions:options" as const satisfies CacheTag;
export const regionTag = (id: string | number): `region:${string}` =>
  `region:${String(id)}` as const;

// Category tags
export const categoriesTag = "categories" as const satisfies CacheTag;
export const categoryTag = (id: string | number): `category:${string}` =>
  `category:${String(id)}` as const;

// Promotion tags
export const promotionsTag = "promotions" as const satisfies CacheTag;

// News tags
export const newsTag = "news" as const satisfies CacheTag;
export const newsPlaceTag = (slug: string): `news:place:${string}` =>
  boundedTag("news:place", slug);
export const newsSlugTag = (slug: string): `news:${string}` =>
  boundedTag("news", slug);


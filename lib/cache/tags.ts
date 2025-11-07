/**
 * Cache tag helpers for Next.js 16 tag-based caching
 * Provides type-safe tag builders and constants
 */
import type { CacheTag } from "types/cache";

// Event tags
export const eventsTag = "events" as const satisfies CacheTag;
export const eventsCategorizedTag = "events:categorized" as const satisfies CacheTag;
export const eventTag = (slug: string): `event:${string}` =>
  `event:${slug}` as const;

// Place tags
export const placesTag = "places" as const satisfies CacheTag;
export const placeTag = (slug: string): `place:${string}` =>
  `place:${slug}` as const;

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


/**
 * Centralized cache tag types for Next.js 16 tag-based caching
 * Used with updateTag(), revalidateTag(), and fetch next.tags
 */
export type CacheTag =
  | "events"
  | "events:categorized"
  | `event:${string}`
  | "places"
  | `place:${string}`
  | "cities"
  | `city:${string}`
  | "regions"
  | `region:${string}`
  | "regions:options"
  | "categories"
  | `category:${string}`
  | "promotions"
  | "news"
  | `news:place:${string}`
  | `news:${string}`;


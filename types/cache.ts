/**
 * Cache function type that fetches and caches data
 */
export type CacheFn<T> = (fetcher: () => Promise<T>) => Promise<T>;

/**
 * Keyed cache function type that fetches and caches data by key
 */
export type KeyedCacheFn<T> = (
  key: string | number,
  fetcher: (_key: string | number) => Promise<T>
) => Promise<T>;

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

/**
 * Subset of cache tags that can be revalidated via the /api/revalidate endpoint.
 * Limited to infrequently-changing data (places, regions, cities, categories).
 * Does NOT include events/news to prevent abuse.
 */
export type RevalidatableTag =
  | "places"
  | "regions"
  | "regions:options"
  | "cities"
  | "categories";

/**
 * Cache entry type for time-based caching utilities
 */
export type CacheEntry<T> = {
  data: T;
  timestamp: number;
};


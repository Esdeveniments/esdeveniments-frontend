/**
 * Cache function type that fetches and caches data
 */
export type CacheFn<T> = (fetcher: () => Promise<T>) => Promise<T>;

/**
 * storeEmpty: false skips null, undefined and [] results, for fetchers that
 * return those on failure. Defaults to true.
 */
export type CacheOptions = { storeEmpty?: boolean };

/** maxEntries: drop the oldest entry beyond this size. */
export type KeyedCacheOptions = CacheOptions & { maxEntries?: number };

/**
 * Keyed cache function type that fetches and caches data by key
 */
export type KeyedCacheFn<T> = (
  key: string | number,
  fetcher: (_key: string | number) => Promise<T>
) => Promise<T>;

/** A cached backend list for Proxy checks (lib/api/proxy-list.ts). */
export type ProxyListLoader<T> = {
  isBackingOff: () => boolean;
  backOff: () => void;
  load: (signal: AbortSignal) => Promise<T[]>;
};

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
  | `news:${string}`
  | "users"
  | `user:${string}`;

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


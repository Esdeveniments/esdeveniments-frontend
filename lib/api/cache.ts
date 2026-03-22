import type { CacheEntry, CacheFn, KeyedCacheFn } from "types/cache";

/**
 * Simple time-based cache for single values.
 * Returns an object with both the cache function and a clear function.
 */
export function createCache<T>(ttlMs: number): {
  cache: CacheFn<T>;
  clear: () => void;
} {
  let cacheEntry: CacheEntry<T> | null = null;

  const cache: CacheFn<T> = async (fetcher) => {
    if (cacheEntry && performance.now() - cacheEntry.timestamp < ttlMs) {
      return cacheEntry.data;
    }
    const data = await fetcher();
    cacheEntry = { data, timestamp: performance.now() };
    return data;
  };

  const clear = () => {
    cacheEntry = null;
  };

  return { cache, clear };
}

/**
 * Keyed cache for values by key (e.g. by ID).
 * Returns an object with both the cache function and a clear function.
 */
export function createKeyedCache<T>(ttlMs: number): {
  cache: KeyedCacheFn<T>;
  clear: () => void;
} {
  const cacheMap = new Map<string | number, { data: T; timestamp: number }>();

  const cache: KeyedCacheFn<T> = async (key, fetcher) => {
    const entry = cacheMap.get(key);
    if (entry && performance.now() - entry.timestamp < ttlMs) {
      return entry.data;
    }
    const data = await fetcher(key);
    cacheMap.set(key, { data, timestamp: performance.now() });
    return data;
  };

  const clear = () => {
    cacheMap.clear();
  };

  return { cache, clear };
}

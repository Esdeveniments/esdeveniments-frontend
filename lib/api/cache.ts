import type {
  CacheEntry,
  CacheFn,
  CacheOptions,
  KeyedCacheFn,
  KeyedCacheOptions,
} from "types/cache";

const isEmpty = (data: unknown) =>
  data == null || (Array.isArray(data) && data.length === 0);

/**
 * Simple time-based cache for single values.
 * Returns an object with both the cache function and a clear function.
 */
export function createCache<T>(
  ttlMs: number,
  { storeEmpty = true }: CacheOptions = {},
): {
  cache: CacheFn<T>;
  clear: () => void;
} {
  let cacheEntry: CacheEntry<T> | null = null;

  const cache: CacheFn<T> = async (fetcher) => {
    if (cacheEntry && performance.now() - cacheEntry.timestamp < ttlMs) {
      return cacheEntry.data;
    }
    const data = await fetcher();
    if (storeEmpty || !isEmpty(data)) {
      cacheEntry = { data, timestamp: performance.now() };
    }
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
export function createKeyedCache<T>(
  ttlMs: number,
  { storeEmpty = true, maxEntries }: KeyedCacheOptions = {},
): {
  cache: KeyedCacheFn<T>;
  clear: () => void;
  delete: (key: string | number) => void;
} {
  const cacheMap = new Map<string | number, { data: T; timestamp: number }>();

  const cache: KeyedCacheFn<T> = async (key, fetcher) => {
    const entry = cacheMap.get(key);
    if (entry && performance.now() - entry.timestamp < ttlMs) {
      return entry.data;
    }
    const data = await fetcher(key);
    if (storeEmpty || !isEmpty(data)) {
      cacheMap.delete(key);
      cacheMap.set(key, { data, timestamp: performance.now() });
      if (maxEntries !== undefined && cacheMap.size > maxEntries) {
        // Map keeps insertion order, so the first key is the oldest.
        cacheMap.delete(cacheMap.keys().next().value!);
      }
    }
    return data;
  };

  const clear = () => {
    cacheMap.clear();
  };

  const deleteKey = (key: string | number) => {
    cacheMap.delete(key);
  };

  return { cache, clear, delete: deleteKey };
}

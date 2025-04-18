type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

// Simple time-based cache for single values
export function createCache<T>(ttlMs: number) {
  let cache: CacheEntry<T> | null = null;

  return async (fetcher: () => Promise<T>): Promise<T> => {
    const now = Date.now();
    if (cache && now - cache.timestamp < ttlMs) {
      return cache.data;
    }
    const data = await fetcher();
    cache = { data, timestamp: now };
    return data;
  };
}

// Keyed cache for values by key (e.g. by ID)
export function createKeyedCache<T>(ttlMs: number) {
  const cache = new Map<string | number, { data: T; timestamp: number }>();

  return async (fetcher: (key: string | number) => Promise<T>, key: string | number): Promise<T> => {
    const now = Date.now();
    const entry = cache.get(key);
    if (entry && now - entry.timestamp < ttlMs) {
      return entry.data;
    }
    const data = await fetcher(key);
    cache.set(key, { data, timestamp: now });
    return data;
  };
}

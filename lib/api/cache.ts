import type {
  CacheFn,
  CacheSlot,
  KeyedCacheFn,
  KeyedCacheOptions,
  SingleCacheOptions,
} from "types/cache";

const isEmpty = (data: unknown) =>
  data == null || (Array.isArray(data) && data.length === 0);

// Next bundles pages, API routes and instrumentation.ts separately, so each
// gets its own copy of a module-level variable. globalThis is per process.
const SHARED_SLOTS = Symbol.for("esdeveniments.cache.slots");

function getSlot<T>(globalKey: string | undefined): CacheSlot<T> {
  if (!globalKey) return { entry: null };
  const store = globalThis as typeof globalThis & {
    [SHARED_SLOTS]?: Map<string, CacheSlot<unknown>>;
  };
  const slots = (store[SHARED_SLOTS] ??= new Map());
  let slot = slots.get(globalKey);
  if (!slot) {
    slot = { entry: null };
    slots.set(globalKey, slot);
  }
  return slot as CacheSlot<T>;
}

/**
 * Simple time-based cache for single values.
 * Returns an object with both the cache function and a clear function.
 */
export function createCache<T>(
  ttlMs: number,
  { storeEmpty = true, globalKey }: SingleCacheOptions = {},
): {
  cache: CacheFn<T>;
  clear: () => void;
} {
  const slot = getSlot<T>(globalKey);

  const cache: CacheFn<T> = async (fetcher) => {
    const cached = slot.entry;
    if (cached && performance.now() - cached.timestamp < ttlMs) {
      return cached.data;
    }
    const data = await fetcher();
    if (storeEmpty || !isEmpty(data)) {
      slot.entry = { data, timestamp: performance.now() };
    }
    return data;
  };

  const clear = () => {
    slot.entry = null;
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

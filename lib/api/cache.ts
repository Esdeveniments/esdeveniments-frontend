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

const newSlot = <T>(): CacheSlot<T> => ({
  entry: null,
  pending: null,
  generation: 0,
});

function getSlot<T>(globalKey: string | undefined): CacheSlot<T> {
  if (!globalKey) return newSlot<T>();
  const store = globalThis as typeof globalThis & {
    [SHARED_SLOTS]?: Map<string, CacheSlot<unknown>>;
  };
  const slots = (store[SHARED_SLOTS] ??= new Map());
  let slot = slots.get(globalKey);
  if (!slot) {
    slot = newSlot();
    slots.set(globalKey, slot);
  }
  return slot as CacheSlot<T>;
}

/**
 * Simple time-based cache for single values.
 * Returns an object with both the cache function and a clear function.
 * Concurrent misses share one fetch (requests on a cold process would
 * otherwise each call the backend).
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
    if (slot.pending) return slot.pending;

    const generation = slot.generation;
    const pending = (async () => {
      const data = await fetcher();
      if (generation === slot.generation && (storeEmpty || !isEmpty(data))) {
        slot.entry = { data, timestamp: performance.now() };
      }
      return data;
    })();
    slot.pending = pending;
    try {
      return await pending;
    } finally {
      if (slot.pending === pending) slot.pending = null;
    }
  };

  const clear = () => {
    slot.entry = null;
    slot.pending = null;
    slot.generation += 1;
  };

  return { cache, clear };
}

/**
 * Keyed cache for values by key (e.g. by ID).
 * Returns an object with both the cache function and a clear function.
 * Concurrent misses for the same key share one fetch.
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
  const pendingMap = new Map<string | number, Promise<T>>();
  // Bumped by clear() (all keys) and delete() (one key): a fetch started
  // before either doesn't store its result, so an invalidation sticks.
  let generation = 0;
  const keyGenerations = new Map<string | number, number>();
  const generationOf = (key: string | number) =>
    `${generation}:${keyGenerations.get(key) ?? 0}`;

  const cache: KeyedCacheFn<T> = async (key, fetcher) => {
    const entry = cacheMap.get(key);
    if (entry && performance.now() - entry.timestamp < ttlMs) {
      return entry.data;
    }
    const inFlight = pendingMap.get(key);
    if (inFlight) return inFlight;

    const startedIn = generationOf(key);
    const pending = (async () => {
      const data = await fetcher(key);
      if (startedIn === generationOf(key) && (storeEmpty || !isEmpty(data))) {
        cacheMap.delete(key);
        cacheMap.set(key, { data, timestamp: performance.now() });
        if (maxEntries !== undefined && cacheMap.size > maxEntries) {
          // Map keeps insertion order, so the first key is the oldest.
          cacheMap.delete(cacheMap.keys().next().value!);
        }
      }
      return data;
    })();
    pendingMap.set(key, pending);
    try {
      return await pending;
    } finally {
      if (pendingMap.get(key) === pending) pendingMap.delete(key);
    }
  };

  const clear = () => {
    cacheMap.clear();
    pendingMap.clear();
    keyGenerations.clear();
    generation += 1;
  };

  const deleteKey = (key: string | number) => {
    cacheMap.delete(key);
    if (pendingMap.delete(key)) {
      // Only keys with a fetch in flight need a generation: keeps the map
      // from growing with every deleted key.
      keyGenerations.set(key, (keyGenerations.get(key) ?? 0) + 1);
    }
  };

  return { cache, clear, delete: deleteKey };
}

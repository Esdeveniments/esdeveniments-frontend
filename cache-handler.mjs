import { brotliCompressSync, brotliDecompressSync, constants as zlib } from "node:zlib";
import { createClient } from "redis";
import { PHASE_PRODUCTION_BUILD } from "next/constants.js";
import { CacheHandler } from "@fortedigital/nextjs-cache-handler";
import createLruHandler from "@fortedigital/nextjs-cache-handler/local-lru";
import createRedisHandler from "@fortedigital/nextjs-cache-handler/redis-strings";

/**
 * Build the Redis URL from individual env vars when REDIS_URL is not set.
 */
function getRedisUrl() {
  if (process.env.REDIS_URL?.trim()) {
    return process.env.REDIS_URL;
  }

  const host = process.env.REDIS_HOST;
  if (!host) return null;

  const port = process.env.REDIS_PORT || "6379";
  const password = process.env.REDIS_PASSWORD;
  const username = process.env.REDIS_USERNAME;
  const auth = password
    ? `${username ? encodeURIComponent(username) : ""}:${encodeURIComponent(password)}@`
    : username
      ? `${encodeURIComponent(username)}@`
      : "";

  // TLS (rediss://) requires REDIS_URL to be set directly.
  // Individual REDIS_HOST/PASSWORD vars always use plain redis://.
  return `redis://${auth}${host}:${port}`;
}

/** Cooldown period (ms) before retrying Redis after a failure — prevents log spam during outages. */
const RETRY_COOLDOWN_MS = 30_000;

/** Global namespace shared by every build's cache keys (see cacheKeyPrefix below). */
const GLOBAL_CACHE_KEY_PREFIX = "next:cache:";

/**
 * In-process LRU ceiling. The library's `maxItemSizeBytes` is actually the
 * cache's TOTAL `maxSize` (the lib naming is misleading); its default is 100 MB.
 * Halve it to bound per-container RAM on the shared self-hosted box — evicted
 * entries simply fall through to Redis on the same host, which is cheap.
 */
const LRU_MAX_TOTAL_BYTES = 50 * 1024 * 1024;

/** Marks a compressed Redis entry. Older entries are plain JSON (they start with "{"). */
const COMPRESSED_PREFIX = "br1:";

// The library hands the serializer page and route data as base64 strings,
// which brotli can't shrink much (2.9x on a stored page). Turning them back
// into bytes first gives 9x (a ~390 KB listing shell to ~43 KB) for ~1-2 ms
// per set and under 1 ms per get. Quality 4: higher levels cost more CPU for
// a few percent.
const BINARY_FIELDS = { APP_PAGE: ["rscData", "segmentData"], APP_ROUTE: ["body"] };

/**
 * valueSerializer for the Redis handler: binary fields go into one buffer
 * after a JSON header, the whole buffer is brotli-compressed, and the result
 * is stored as base64 text (the client returns strings). Plain JSON entries
 * are still read, so the change needs no cache flush.
 */
export const compressedValueSerializer = {
  serialize(entry) {
    const blobs = [];
    const toBlob = (base64) => blobs.push(Buffer.from(base64, "base64")) - 1;
    const value = entry.value ? { ...entry.value } : entry.value;
    for (const field of BINARY_FIELDS[value?.kind] ?? []) {
      const data = value[field];
      if (typeof data === "string") value[field] = toBlob(data);
      else if (data && typeof data === "object") {
        value[field] = Object.fromEntries(
          Object.entries(data).map(([key, base64]) => [key, toBlob(base64)]),
        );
      }
    }
    const header = Buffer.from(
      JSON.stringify({ ...entry, value, blobLengths: blobs.map((b) => b.length) }),
    );
    const headerLength = Buffer.alloc(4);
    headerLength.writeUInt32BE(header.length);
    const packed = Buffer.concat([headerLength, header, ...blobs]);
    const compressed = brotliCompressSync(packed, {
      params: {
        [zlib.BROTLI_PARAM_QUALITY]: 4,
        [zlib.BROTLI_PARAM_SIZE_HINT]: packed.length,
      },
    });
    return COMPRESSED_PREFIX + compressed.toString("base64");
  },
  deserialize(stored) {
    const text = String(stored);
    if (!text.startsWith(COMPRESSED_PREFIX)) return JSON.parse(text);

    const packed = brotliDecompressSync(
      Buffer.from(text.slice(COMPRESSED_PREFIX.length), "base64"),
    );
    const headerEnd = 4 + packed.readUInt32BE(0);
    const { blobLengths, ...entry } = JSON.parse(packed.toString("utf8", 4, headerEnd));
    const blobs = [];
    let offset = headerEnd;
    for (const length of blobLengths) {
      blobs.push(packed.toString("base64", offset, offset + length));
      offset += length;
    }
    const value = entry.value;
    for (const field of BINARY_FIELDS[value?.kind] ?? []) {
      const data = value[field];
      if (typeof data === "number") value[field] = blobs[data];
      else if (data && typeof data === "object") {
        value[field] = Object.fromEntries(
          Object.entries(data).map(([key, index]) => [key, blobs[index]]),
        );
      }
    }
    return entry;
  },
};

/** Shared LRU fallback — created once, reused across all requests and cooldown periods. */
const lruFallbackConfig = {
  handlers: [createLruHandler({ maxItemSizeBytes: LRU_MAX_TOTAL_BYTES })],
};

/**
 * Remove cache entries written by previous deploys.
 *
 * Every key is namespaced `next:cache:<buildId>:` (see cacheKeyPrefix below).
 * Entries with a `revalidate` lifespan get a Redis TTL, but fully-static entries
 * never expire, so each deploy leaves the prior build's keys behind and Redis
 * grows without bound. On a fresh, healthy connection we SCAN the namespace and
 * UNLINK anything that doesn't belong to the current build.
 *
 * Safe during rolling deploys: a still-running old container that loses its keys
 * just regenerates them on the next request — a cache miss, never wrong data.
 * Uses SCAN + UNLINK (non-blocking) so it never stalls Redis.
 *
 * @returns {Promise<number>} count of keys removed
 */
export async function purgeStaleBuildCaches({ client, keyPrefix, scanCount = 500 }) {
  // Only safe when scoped to a specific build. Without a build id the prefix is
  // the global namespace itself, so current and stale are indistinguishable — skip.
  if (!keyPrefix || keyPrefix === GLOBAL_CACHE_KEY_PREFIX) return 0;

  // node-redis 6 rejects a numeric cursor ("arguments[1]" must be of type
  // "string | Buffer"), so every purge failed and old builds' keys stayed.
  let cursor = "0";
  let removed = 0;
  do {
    const { cursor: next, keys } = await client.scan(cursor, {
      MATCH: `${GLOBAL_CACHE_KEY_PREFIX}*`,
      COUNT: scanCount,
    });
    cursor = next;
    // Defense-in-depth: confirm the namespace prefix in JS rather than trusting
    // SCAN's MATCH alone, so a misbehaving client/proxy can never delete keys
    // outside the cache namespace (e.g. sessions, other apps' data).
    const stale = keys.filter(
      (key) => key.startsWith(GLOBAL_CACHE_KEY_PREFIX) && !key.startsWith(keyPrefix),
    );
    if (stale.length > 0) {
      await client.unlink(stale);
      removed += stale.length;
    }
    // node-redis v5 returns the cursor as a string ("0" when done); Number()
    // also handles clients that return a numeric cursor. Comparing to 0 (not
    // "0") avoids an infinite rescan loop.
  } while (Number(cursor) !== 0);

  return removed;
}

CacheHandler.onCreation(({ buildId } = {}) => {
  // If a previous failure occurred, check whether the cooldown has elapsed.
  // If so, clear the fallback config to allow a reconnection attempt below.
  if (globalThis.__cacheHandlerLastFailure) {
    if (Date.now() - globalThis.__cacheHandlerLastFailure < RETRY_COOLDOWN_MS) {
      // Still in cooldown — keep using LRU fallback
      return lruFallbackConfig;
    }
    // Cooldown expired — clear failure state so we retry Redis
    globalThis.__cacheHandlerLastFailure = null;
    globalThis.__cacheHandlerConfig = null;
  }

  // Singleton: reuse existing config if already initialized (healthy Redis or stable LRU)
  if (globalThis.__cacheHandlerConfig) {
    return globalThis.__cacheHandlerConfig;
  }
  if (globalThis.__cacheHandlerConfigPromise) {
    return globalThis.__cacheHandlerConfigPromise;
  }

  const redisUrl = getRedisUrl();

  // No Redis configured — use in-memory LRU (graceful no-op for local dev / builds without Redis)
  if (!redisUrl || PHASE_PRODUCTION_BUILD === process.env.NEXT_PHASE) {
    return lruFallbackConfig;
  }

  globalThis.__cacheHandlerConfigPromise = (async () => {
    let redisClient = null;

    try {
      redisClient = createClient({
        url: redisUrl,
        pingInterval: 10_000,
        // Accept self-signed TLS certs (common in Coolify environments).
        // Mirrors the health probe's TLS policy in app/api/health/route.ts.
        socket: redisUrl.startsWith("rediss://")
          ? { tls: true, rejectUnauthorized: false }
          : undefined,
      });

      // Use on() not once() — node-redis requires a persistent error listener
      // to prevent unhandled exceptions if multiple errors fire before disconnect.
      redisClient.on("error", (e) => {
        console.warn("[cache-handler] Redis error:", e.message);
        // Disconnect the failed client to prevent resource leaks.
        // Don't set __cacheHandlerConfig — the cooldown logic handles fallback.
        redisClient?.disconnect().catch(() => {});
        globalThis.__cacheHandlerConfig = null;
        globalThis.__cacheHandlerConfigPromise = null;
        globalThis.__cacheHandlerLastFailure = Date.now();
      });

      await redisClient.connect();
      console.info("[cache-handler] Redis connected.");
    } catch (error) {
      console.warn("[cache-handler] Redis connection failed:", error.message);
      await redisClient?.disconnect().catch(() => {});
      redisClient = null;
      globalThis.__cacheHandlerLastFailure = Date.now();
    }

    if (!redisClient?.isReady) {
      console.warn("[cache-handler] Falling back to LRU cache.");
      globalThis.__cacheHandlerConfigPromise = null;
      // Don't set __cacheHandlerConfig — keep fallback ephemeral so
      // the cooldown logic can retry Redis after RETRY_COOLDOWN_MS.
      return lruFallbackConfig;
    }

    // Scope cache keys by build id so a new deploy never reads prerendered
    // shells written by a previous build. Without this, Coolify's Redis serves
    // a stale shell whose React tree no longer matches the new build's resume
    // ("Expected the resume to render ..."), so SSR falls back to client
    // rendering and the page ships without its <title>/meta. Vercel/localhost
    // don't use this handler, which is why only self-hosted builds broke.
    const cacheKeyPrefix = buildId
      ? `${GLOBAL_CACHE_KEY_PREFIX}${buildId}:`
      : GLOBAL_CACHE_KEY_PREFIX;

    const redisHandler = createRedisHandler({
      client: redisClient,
      keyPrefix: cacheKeyPrefix,
      valueSerializer: compressedValueSerializer,
    });

    // Fire-and-forget: drop previous deploys' cache keys so Redis can't grow
    // unbounded across builds. Never block first-request serving on this; run once.
    if (!globalThis.__cacheHandlerPurgeStarted) {
      globalThis.__cacheHandlerPurgeStarted = true;
      purgeStaleBuildCaches({ client: redisClient, keyPrefix: cacheKeyPrefix })
        .then((removed) => {
          if (removed > 0) {
            console.info(`[cache-handler] Purged ${removed} stale build cache key(s).`);
          }
        })
        .catch((error) => {
          console.warn("[cache-handler] Stale cache purge failed:", error.message);
          // Allow a retry on the next healthy connection — the Redis error
          // listener clears the config and forces re-init, so without this a
          // transient failure would skip the purge for the rest of the process.
          globalThis.__cacheHandlerPurgeStarted = false;
        });
    }

    globalThis.__cacheHandlerConfigPromise = null;
    globalThis.__cacheHandlerConfig = { handlers: [redisHandler, lruFallbackConfig.handlers[0]] };
    return globalThis.__cacheHandlerConfig;
  })();

  return globalThis.__cacheHandlerConfigPromise;
});

export default CacheHandler;

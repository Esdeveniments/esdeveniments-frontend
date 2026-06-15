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

  let cursor = 0;
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

    const cacheKeyPrefix = buildId
      ? `${GLOBAL_CACHE_KEY_PREFIX}${buildId}:`
      : GLOBAL_CACHE_KEY_PREFIX;

    const redisHandler = createRedisHandler({
      client: redisClient,
      keyPrefix: cacheKeyPrefix,
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

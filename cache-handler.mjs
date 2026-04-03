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

  return `redis://${auth}${host}:${port}`;
}

/** Cooldown period (ms) before retrying Redis after a failure — prevents log spam during outages. */
const RETRY_COOLDOWN_MS = 30_000;

/** Shared LRU fallback — created once, reused across all requests and cooldown periods. */
const lruFallbackConfig = { handlers: [createLruHandler()] };

CacheHandler.onCreation(() => {
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

      redisClient.once("error", (e) => {
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

    const redisHandler = createRedisHandler({
      client: redisClient,
      keyPrefix: "next:cache:",
    });

    globalThis.__cacheHandlerConfigPromise = null;
    globalThis.__cacheHandlerConfig = { handlers: [redisHandler, lruFallbackConfig.handlers[0]] };
    return globalThis.__cacheHandlerConfig;
  })();

  return globalThis.__cacheHandlerConfigPromise;
});

export default CacheHandler;

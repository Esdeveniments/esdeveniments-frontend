import { createClient } from "redis";

/**
 * App-level Redis cache, deliberately separate from the Next.js incremental
 * cache handler (cache-handler.mjs). That handler namespaces every key by
 * buildId, so its entries are dropped on each deploy — correct for prerender
 * shells, wrong for data we want to outlive deploys (e.g. Google Places
 * results). This client uses stable, unprefixed keys.
 *
 * Fails open: any connection or command error resolves to null / no-op so the
 * caller falls back to the origin. It never throws into the request path.
 */

/** Back off this long after a failure so a Redis outage can't trigger a connect attempt on every request. */
const FAILURE_COOLDOWN_MS = 30_000;

const globalForRedis = globalThis as unknown as {
  __appRedis?: Promise<ReturnType<typeof createClient> | null>;
  __appRedisFailedAt?: number;
};

/** Mirrors cache-handler.mjs so both layers resolve Redis the same way. */
function getRedisUrl(): string | null {
  if (process.env.REDIS_URL?.trim()) return process.env.REDIS_URL;

  const host = process.env.REDIS_HOST;
  if (!host) return null;

  const port = process.env.REDIS_PORT || "6379";
  const password = process.env.REDIS_PASSWORD;
  const username = process.env.REDIS_USERNAME;
  const auth = password
    ? `${username ? encodeURIComponent(username) : ""}:${encodeURIComponent(
        password
      )}@`
    : username
      ? `${encodeURIComponent(username)}@`
      : "";

  return `redis://${auth}${host}:${port}`;
}

async function getClient(): Promise<ReturnType<typeof createClient> | null> {
  if (globalForRedis.__appRedis) return globalForRedis.__appRedis;

  if (
    globalForRedis.__appRedisFailedAt &&
    Date.now() - globalForRedis.__appRedisFailedAt < FAILURE_COOLDOWN_MS
  ) {
    return null;
  }

  const url = getRedisUrl();
  if (!url) return null;

  const isTls = url.startsWith("rediss://");

  globalForRedis.__appRedis = (async () => {
    try {
      const client = createClient({
        url,
        pingInterval: 10_000,
        socket: isTls
          ? { tls: true, rejectUnauthorized: false, connectTimeout: 2_000 }
          : { connectTimeout: 2_000 },
      });
      // node-redis needs a persistent error listener or it throws on errors.
      // node-redis reconnects on its own; we just record the last failure so
      // getClient() can back off if the connection never recovers.
      client.on("error", () => {
        globalForRedis.__appRedisFailedAt = Date.now();
      });
      await client.connect();
      return client;
    } catch {
      globalForRedis.__appRedis = undefined;
      globalForRedis.__appRedisFailedAt = Date.now();
      return null;
    }
  })();

  return globalForRedis.__appRedis;
}

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  try {
    const client = await getClient();
    if (!client) return null;
    const raw = await client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSetJson(
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  try {
    const client = await getClient();
    if (!client) return;
    // SETEX (dedicated helper) avoids the deprecated { EX } option and is
    // stable across redis v5/v6.
    await client.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // best-effort: a failed cache write must never fail the request
  }
}

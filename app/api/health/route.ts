import { NextRequest, NextResponse } from "next/server";
import { createConnection } from "node:net";
import { connect as tlsConnect } from "node:tls";
import { isApiUrlConfigured } from "@utils/api-helpers";
import { isCloudflarePurgeConfigured } from "@lib/cdn/cloudflare-config";
import { parseRedisStats, parseRespReplies, respCommand } from "@utils/redis-resp";
import { safeEqual } from "@utils/safe-equal";
import type { RedisStats } from "types/cache";

/**
 * Health check endpoint for monitoring runtime configuration.
 *
 * Public access: Returns simple status only (no sensitive details)
 * Authenticated access: Returns full diagnostic info including Redis
 * connectivity, memory (used vs maxmemory), evictions and hit counters
 *
 * Usage:
 *   GET /api/health → { status: "healthy" | "degraded" }
 *   GET /api/health with header `x-health-secret: <HEALTH_SECRET>` → full details
 *
 * The secret goes in a header, never the query string, so it stays out of
 * CDN and proxy access logs. Until HEALTH_SECRET is set, REVALIDATE_SECRET
 * is accepted instead.
 */

function isHealthSecret(provided: string | null): boolean {
  const expected = process.env.HEALTH_SECRET || process.env.REVALIDATE_SECRET;
  if (!expected || !provided) return false;
  return safeEqual(provided, expected);
}

/**
 * One raw RESP connection (avoids importing the redis package): AUTH when a
 * password is set, then PING, INFO memory/stats and DBSIZE, pipelined.
 * Returns null when Redis is unreachable or doesn't answer PONG.
 */
async function checkRedis(): Promise<RedisStats | null> {
  let parsedUrl: URL | null = null;
  try {
    if (process.env.REDIS_URL) parsedUrl = new URL(process.env.REDIS_URL);
  } catch {
    /* invalid URL */
  }

  const host = parsedUrl?.hostname || process.env.REDIS_HOST;
  const port = Number(parsedUrl?.port || process.env.REDIS_PORT || "6379");
  const useTls = parsedUrl?.protocol === "rediss:";
  // URL keeps userinfo percent-encoded ("p%40ss"); node-redis decodes it, so must we.
  const decode = (value: string) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };
  const password = decode(parsedUrl?.password ?? "") || process.env.REDIS_PASSWORD;
  const username = decode(parsedUrl?.username ?? "") || process.env.REDIS_USERNAME;

  if (!host) return null;

  const auth = password
    ? [username ? respCommand("AUTH", username, password) : respCommand("AUTH", password)]
    : [];
  const commands = [
    ...auth,
    respCommand("PING"),
    respCommand("INFO", "memory"),
    respCommand("INFO", "stats"),
    respCommand("DBSIZE"),
  ];

  return new Promise((resolve) => {
    const socket = useTls
      ? tlsConnect({ host, port, rejectUnauthorized: false }, onConnect)
      : createConnection({ host, port }, onConnect);
    function onConnect() {
      socket.write(commands.join(""));
    }
    const finish = (result: RedisStats | null) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(2000);
    // Replies may arrive across several packets.
    let buffer = Buffer.alloc(0);
    socket.on("data", (data) => {
      buffer = Buffer.concat([buffer, Buffer.from(data)]);
      const replies = parseRespReplies(buffer, commands.length);
      if (!replies) return;
      const [pong, memory, stats, keys] = replies.slice(auth.length);
      // node-redis fails to connect when AUTH fails, even if PING would work.
      if (auth.length && replies[0] !== "OK") return finish(null);
      if (pong !== "PONG") return finish(null);
      finish(parseRedisStats(`${memory ?? ""}\r\n${stats ?? ""}`, Number(keys)));
    });
    socket.on("error", () => finish(null));
    socket.on("timeout", () => finish(null));
    // A close before every reply arrived (no error) would otherwise hang the request.
    socket.on("close", () => finish(null));
  });
}

export async function GET(request: NextRequest) {
  // Only check server-only env vars for public health status.
  // NEXT_PUBLIC_* vars get inlined at build time by Turbopack — if the build
  // arg is missing (e.g. PR preview deployments), the inlined value is ""
  // which would make the healthcheck fail even though the runtime env is set.
  // The API URL has a fallback in config/api-defaults.json, so the app works
  // without NEXT_PUBLIC_API_URL. Full config diagnostics are in the
  // authenticated response below.
  const hmacConfigured = Boolean(process.env.HMAC_SECRET);
  const redisConfigured = Boolean(
    process.env.REDIS_URL || process.env.REDIS_HOST
  );
  const isHealthy = hmacConfigured;

  const isAuthenticated = isHealthSecret(request.headers.get("x-health-secret"));

  // Public response: minimal info only
  if (!isAuthenticated) {
    return NextResponse.json(
      {
        status: isHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
      },
      {
        status: isHealthy ? 200 : 503,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  }

  // Authenticated response: full diagnostic details with Redis connectivity
  const redis = redisConfigured ? await checkRedis() : null;
  const redisReachable = redis !== null;
  // Degrade status when Redis is expected but unreachable (cache layer is down)
  const isFullyHealthy = isHealthy && (!redisConfigured || redisReachable);
  // Use the same validated resolution as the app: isApiUrlConfigured() treats a
  // malformed URL as not configured, so diagnostics match runtime behavior.
  const apiUrlConfigured = isApiUrlConfigured();

  return NextResponse.json(
    {
      status: isFullyHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      cache: {
        strategy: redisReachable ? "redis" : "filesystem",
        shared: redisReachable,
        connected: redisReachable,
        configured: redisConfigured,
        redis,
      },
      config: {
        apiUrlConfigured,
        hmacConfigured,
        backendKeyConfigured: Boolean(process.env.BACKEND_SERVICE_SECRET),
        revalidateSecretConfigured: Boolean(process.env.REVALIDATE_SECRET),
        healthSecretConfigured: Boolean(process.env.HEALTH_SECRET),
        cloudflarePurgeConfigured: isCloudflarePurgeConfigured(),
        redisConfigured,
      },
      buildVersion: process.env.BUILD_VERSION || "unknown",
      environment: process.env.NODE_ENV,
    },
    {
      // Use isHealthy (core services) for HTTP status — not Redis.
      // Redis outage = degraded but app still works with LRU fallback.
      // Returning 503 for Redis would trigger unnecessary container restarts.
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

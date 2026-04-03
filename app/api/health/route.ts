import { NextRequest, NextResponse } from "next/server";
import { createClient } from "redis";

/**
 * Health check endpoint for monitoring runtime configuration.
 *
 * Public access: Returns simple status only (no sensitive details)
 * Authenticated access: Returns full diagnostic info including Redis connectivity
 *
 * Usage:
 *   GET /api/health → { status: "healthy" | "degraded" }
 *   GET /api/health?secret=<REVALIDATE_SECRET> → full details
 */

async function checkRedisConnectivity(): Promise<boolean> {
  const url =
    process.env.REDIS_URL ||
    (process.env.REDIS_HOST
      ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || "6379"}`
      : null);
  if (!url) return false;

  let client;
  try {
    client = createClient({ url });
    client.on("error", () => {}); // suppress error events during probe
    await client.connect();
    const pong = await client.ping();
    return pong === "PONG";
  } catch {
    return false;
  } finally {
    client?.quit().catch(() => {});
  }
}

export async function GET(request: NextRequest) {
  const apiUrlConfigured = Boolean(process.env.NEXT_PUBLIC_API_URL);
  const hmacConfigured = Boolean(process.env.HMAC_SECRET);
  const redisConfigured = Boolean(
    process.env.REDIS_URL || process.env.REDIS_HOST
  );
  const isHealthy = apiUrlConfigured && hmacConfigured;

  // Check if authenticated (use same secret as revalidation endpoint)
  const secret = request.nextUrl.searchParams.get("secret");
  const isAuthenticated = secret && secret === process.env.REVALIDATE_SECRET;

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
  const redisReachable = redisConfigured ? await checkRedisConnectivity() : false;

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      cache: {
        strategy: redisConfigured ? "redis" : "filesystem",
        shared: redisConfigured,
        connected: redisReachable,
      },
      config: {
        apiUrlConfigured,
        hmacConfigured,
        revalidateSecretConfigured: Boolean(process.env.REVALIDATE_SECRET),
        redisConfigured,
      },
      environment: process.env.NODE_ENV,
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

import { NextRequest, NextResponse } from "next/server";
import { createConnection } from "net";

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

/** Lightweight Redis PING using raw TCP — avoids importing the redis package. */
async function checkRedisConnectivity(): Promise<boolean> {
  const redisUrl = process.env.REDIS_URL;
  const host = redisUrl
    ? new URL(redisUrl).hostname
    : process.env.REDIS_HOST;
  const port = redisUrl
    ? Number(new URL(redisUrl).port || "6379")
    : Number(process.env.REDIS_PORT || "6379");

  if (!host) return false;

  return new Promise((resolve) => {
    const socket = createConnection({ host, port }, () => {
      socket.write("PING\r\n");
    });
    socket.setTimeout(2000);
    socket.on("data", (data) => {
      const response = data.toString().trim();
      socket.destroy();
      resolve(response.includes("PONG"));
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
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

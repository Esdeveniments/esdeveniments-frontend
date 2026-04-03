import { NextRequest, NextResponse } from "next/server";
import { createConnection } from "net";
import { connect as tlsConnect } from "tls";

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
  let parsedUrl: URL | null = null;
  try {
    if (process.env.REDIS_URL) parsedUrl = new URL(process.env.REDIS_URL);
  } catch {
    /* invalid URL */
  }

  const host = parsedUrl?.hostname || process.env.REDIS_HOST;
  const port = Number(parsedUrl?.port || process.env.REDIS_PORT || "6379");
  const useTls = parsedUrl?.protocol === "rediss:";
  const password =
    (parsedUrl?.password && decodeURIComponent(parsedUrl.password)) ||
    process.env.REDIS_PASSWORD;
  const username =
    (parsedUrl?.username && decodeURIComponent(parsedUrl.username)) ||
    process.env.REDIS_USERNAME;

  if (!host) return false;

  return new Promise((resolve) => {
    let authenticated = !password; // skip auth if no password
    const socket = useTls
      ? tlsConnect({ host, port }, onConnect)
      : createConnection({ host, port }, onConnect);

    function onConnect() {
      if (password) {
        const authCmd = username
          ? `AUTH ${username} ${password}\r\n`
          : `AUTH ${password}\r\n`;
        socket.write(authCmd);
      } else {
        socket.write("PING\r\n");
      }
    }
    socket.setTimeout(2000);
    socket.on("data", (data) => {
      const response = data.toString().trim();
      if (!authenticated && response.includes("OK")) {
        authenticated = true;
        socket.write("PING\r\n");
        return;
      }
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
  // Degrade status when Redis is expected but unreachable (cache layer is down)
  const isFullyHealthy = isHealthy && (!redisConfigured || redisReachable);

  return NextResponse.json(
    {
      status: isFullyHealthy ? "healthy" : "degraded",
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
      status: isFullyHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

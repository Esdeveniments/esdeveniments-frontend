import { NextRequest, NextResponse } from "next/server";
import { createConnection } from "node:net";
import { connect as tlsConnect } from "node:tls";

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
  // Node's URL constructor already decodes username/password — no decodeURIComponent needed
  const password = parsedUrl?.password || process.env.REDIS_PASSWORD;
  const username = parsedUrl?.username || process.env.REDIS_USERNAME;

  if (!host) return false;

  return new Promise((resolve) => {
    let authenticated = !password; // skip auth if no password
    const socket = useTls
      ? tlsConnect({ host, port, rejectUnauthorized: false }, onConnect)
      : createConnection({ host, port }, onConnect);

    /** Build a RESP array command — handles passwords with spaces/special chars. */
    function respCmd(...args: string[]): string {
      let cmd = `*${args.length}\r\n`;
      for (const arg of args) {
        cmd += `$${Buffer.byteLength(arg)}\r\n${arg}\r\n`;
      }
      return cmd;
    }

    function onConnect() {
      if (password) {
        socket.write(
          username ? respCmd("AUTH", username, password) : respCmd("AUTH", password)
        );
      } else {
        socket.write(respCmd("PING"));
      }
    }
    socket.setTimeout(2000);
    // Accumulate TCP data — responses may arrive across multiple packets
    let buffer = "";
    socket.on("data", (data) => {
      buffer += data.toString();
      // RESP responses are terminated by \r\n — wait for complete response
      if (!buffer.includes("\r\n")) return;

      if (!authenticated && buffer.startsWith("+OK")) {
        authenticated = true;
        // Keep any data after the +OK\r\n (e.g. +PONG\r\n in same packet)
        buffer = buffer.substring(buffer.indexOf("\r\n") + 2);
        socket.write(respCmd("PING"));
        if (!buffer.includes("\r\n")) return; // wait for PONG in next packet
        // fall through to check for PONG below
      }
      socket.destroy();
      resolve(buffer.startsWith("+PONG"));
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
  // Use indirect access for diagnostic display — avoids Turbopack inlining
  const apiUrlKey = "NEXT_PUBLIC_API_URL";
  const apiUrlConfigured = Boolean(process.env[apiUrlKey]);

  return NextResponse.json(
    {
      status: isFullyHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      cache: {
        strategy: redisReachable ? "redis" : "filesystem",
        shared: redisReachable,
        connected: redisReachable,
        configured: redisConfigured,
      },
      config: {
        apiUrlConfigured,
        hmacConfigured,
        revalidateSecretConfigured: Boolean(process.env.REVALIDATE_SECRET),
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

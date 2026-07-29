import { NextRequest, NextResponse } from "next/server";
import { validateTimestamp, buildStringToSign, verifyHmacSignature } from "@utils/hmac";
import { isE2ETestMode } from "@utils/env";

export const isDev = process.env.NODE_ENV !== "production";

function addAllowedOriginHost(hosts: Set<string>, rawUrl: string | undefined) {
  if (!rawUrl) return;
  try {
    const normalizedUrl = /^https?:\/\//i.test(rawUrl)
      ? rawUrl
      : `https://${rawUrl}`;
    hosts.add(new URL(normalizedUrl).host);
  } catch {
    // Ignore invalid deployment config here; the route will reject the Origin.
  }
}

function getAllowedOriginHosts(): Set<string> {
  const hosts = new Set<string>();
  addAllowedOriginHost(
    hosts,
    process.env.NEXT_PUBLIC_SITE_URL ||
      (isDev ? "http://localhost:3000" : "https://www.esdeveniments.cat"),
  );

  // Vercel exposes several runtime URLs that all serve the same deployment:
  //   VERCEL_URL                       — per-deployment hash URL
  //   VERCEL_BRANCH_URL                — stable branch-alias URL (what users
  //                                       click on the PR preview comment;
  //                                       without this, every browser-initiated
  //                                       POST — push subscribe, favorites,
  //                                       sponsor checkout — 403s on branch
  //                                       previews)
  //   VERCEL_PROJECT_PRODUCTION_URL    — the project's prod domain
  // Origin must match whichever one the browser is hitting, otherwise the
  // CSRF guard 403s every POST/PUT/DELETE on the preview. Allow them all.
  for (const candidate of [
    process.env.VERCEL_URL,
    process.env.NEXT_PUBLIC_VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ]) {
    if (candidate) addAllowedOriginHost(hosts, candidate);
  }

  // E2E runs a production build on localhost:3000, so isDev is false there and
  // the same-origin localhost POST would be rejected. E2E_TEST_MODE is set only
  // during E2E runs (never in prod), so this widens the allowlist for tests
  // without touching the production Origin check.
  if (isDev || isE2ETestMode) {
    hosts.add("localhost:3000");
    hosts.add("127.0.0.1:3000");
    hosts.add("[::1]:3000");
  }

  return hosts;
}

// Cache API route patterns at module load to avoid recreating on every request
// Allowlist public API routes that don't require HMAC from the browser
// Use regex patterns for precise matching to prevent accidental exposure of
// deep nested private routes (e.g., /api/regions/admin/users would be blocked).
// Note: Single-segment routes like /api/regions/admin are still allowed to
// support dynamic routes like [id] and [slug], but routes must be explicitly
// created as files in the codebase.
// Allow percent-encoded slugs (accents, spaces, etc.) by matching any non-slash
// segment for dynamic route parts.
// IMPORTANT: These pattern-based routes are restricted to GET-only in the
// isPublicApiRequest check below for defense-in-depth. If a POST/PUT/DELETE
// handler is accidentally added to one of these routes, it will still require HMAC.
export const PUBLIC_API_PATTERNS = [
  // Regions: base, [id], or /options
  /^\/api\/regions(\/(options|[^/]+))?$/,
  // Categories, Cities, News: base or [id/slug]
  /^\/api\/(categories|cities|news)(\/[^/]+)?$/,
  // Places: base, [slug], /nearby, or /photo
  /^\/api\/places(\/(nearby|photo|[^/]+))?$/,
  // Users: base or [username]
  /^\/api\/users(\/[^/]+)?$/,
];

// Routes that require exact match
export const PUBLIC_API_EXACT_PATHS = [
  "/api/promotions/config",
  "/api/promotions/price-preview",
  "/api/promotions/active",
  "/api/leads/restaurant",
  // Favorites cookie endpoints (browser-initiated)
  "/api/favorites",
  "/api/favorites/prune",
  // Migrates guest-cookie favorites into the user's server-side favorites
  // (browser-initiated; auth enforced by the route handler reading the
  // HttpOnly auth_token cookie).
  "/api/favorites/migrate",
  // DISABLED: Restaurant promotions feature is currently disabled
  // "/api/cloudinary/sign",
  // Public image upload for events (browser-initiated; backend expects HMAC only on internal hop)
  "/api/publica/image-upload",
  // Revalidation endpoint handles its own secret, so bypass HMAC middleware
  "/api/revalidate",
  // Health check endpoint for monitoring cache infrastructure
  "/api/health",
  // Sponsor checkout (browser-initiated Stripe checkout session creation)
  "/api/sponsors/checkout",
  // Sponsor availability check (browser-initiated from PlaceSelector)
  "/api/sponsors/availability",
  // Sponsor paid-only image upload (browser-initiated; gated by Stripe session status)
  "/api/sponsors/image-upload",
  // Stripe webhook (signature verified by endpoint, not HMAC)
  "/api/sponsors/webhook",
  // TikTok share page API routes (browser-initiated, proxies to TikTok API)
  "/api/tiktok/token",
  "/api/tiktok/creator-info",
  "/api/tiktok/publish",
  "/api/tiktok/upload",
  "/api/tiktok/status",
  // Web Push subscription (browser-initiated; VAPID send route protects itself with PUSH_SEND_SECRET)
  "/api/push/subscribe",
  "/api/push/send",
  // API-scoped llms.txt (public, machine-readable)
  "/api/llms.txt",
  // Authenticated user-self mutation routes (Bearer comes from HttpOnly cookie
  // inside the route handler; Origin check below is the CSRF guard).
  "/api/users/me/profile",
  "/api/users/me/avatar",
];

// GET-only public exact paths. Gated to GET in isPublicApiRequest so a future
// POST/PUT/DELETE handler on the same path fails closed (HMAC required).
// Logto OIDC routes: browser-initiated redirects + session cookie reads, no
// HMAC — they talk to the identity provider over their own TLS channel.
export const PUBLIC_API_GET_EXACT_PATHS = [
  "/api/auth/sign-in",
  "/api/auth/callback",
  "/api/auth/sign-out",
  "/api/auth/me",
];

// Event routes pattern (GET only): base, [slug], or /categorized
export const EVENTS_PATTERN = /^\/api\/events(\/(categorized|[^/]+))?$/;

// Routes exempt from Origin check (server-to-server callbacks that won't have
// a browser Origin header):
export const ORIGIN_CHECK_EXEMPT = new Set([
  "/api/sponsors/webhook", // Stripe webhook (server-to-server)
  "/api/revalidate", // External revalidation trigger (has own secret)
  "/api/health", // Monitoring probes
  "/api/push/send", // Push broadcast (server-to-server, protected by PUSH_SEND_SECRET)
]);

/**
 * For public POST/PUT/DELETE routes, verify the Origin header matches the
 * site's domain. This blocks casual abuse (curl, bots, cross-site requests)
 * but won't stop sophisticated attackers who spoof headers.
 */
export function isOriginAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");

  // No Origin header → block (curl, scripts, server-to-server without exemption)
  if (!origin) return false;

  try {
    const originHost = new URL(origin).host;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    // Warn if NEXT_PUBLIC_SITE_URL is missing in production — all non-GET
    // public routes will silently 403 because localhost:3000 won't match.
    if (!siteUrl && !isDev) {
      console.warn(
        "[proxy] NEXT_PUBLIC_SITE_URL is not set in production — Origin checks will fail",
      );
    }

    if (getAllowedOriginHosts().has(originHost)) return true;

    // Same-origin via the reverse proxy's x-forwarded-host. This is the
    // scalable check: it allows a state-changing POST whenever the browser's
    // Origin matches the public host the request actually arrived on, so it
    // works on EVERY proxy-fronted deployment (production, staging, Coolify
    // pr-* previews, Vercel previews) without enumerating hosts. Coolify/Traefik
    // and Vercel set x-forwarded-host to the public hostname (verified on the
    // pr-* preview), the same header getRequestOrigin trusts (see LESSONS.md).
    //
    // CSRF-safe: a cross-site browser request can't make these match — its
    // Origin is the attacker's host, while x-forwarded-host is our host (the
    // browser can't forge x-forwarded-host on a credentialed request: simple
    // requests can't set it, and a custom-header request triggers a CORS
    // preflight we never approve). We deliberately do NOT consult the Host
    // header, which is not proxy-validated here — see the "does not trust
    // Host" guard test.
    const forwardedHost = (request.headers.get("x-forwarded-host") ?? "")
      .split(",")[0]
      .trim()
      .toLowerCase();
    if (forwardedHost && originHost.toLowerCase() === forwardedHost) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Gate for the whole /api/ branch of the proxy middleware: multipart
 * allowlist, public-route classification, Origin/CSRF check, and HMAC
 * verification for everything else. Every path through this function
 * returns a NextResponse — proxy() just forwards the result.
 */
export async function gateApiRequest(
  request: NextRequest,
): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Edge-level multipart allowlist. Rejects multipart requests to any
  // non-allowlisted path BEFORE the public-API gate, so that even when a
  // path is also a public-API entry, it still has to pass the same
  // narrow multipart allowlist.
  //
  // Why these three? Each carries a multipart body that the HMAC middleware
  // can't re-sign from a server-cloned stream (multipart binaries can't be
  // re-derived from a server-cloned body without losing boundaries). The
  // three flows use multipart for browser-uploaded images / files:
  //   - /api/users/me/avatar        — HttpOnly cookie auth (avatar)
  //   - /api/publica/image-upload   — IP rate limit + Origin (event image)
  //   - /api/sponsors/image-upload  — Stripe session paid-status guard
  // Every other /api/ path is required to use a JSON body that HMAC can
  // re-sign. PR review thread 121G expanded the allowlist from 1 to 3.
  const MULTIPART_ALLOWLIST = new Set([
    "/api/users/me/avatar",
    "/api/publica/image-upload",
    "/api/sponsors/image-upload",
  ]);
  const requestContentType = (
    request.headers.get("content-type") || ""
  ).toLowerCase();
  if (requestContentType.startsWith("multipart/form-data")) {
    if (!MULTIPART_ALLOWLIST.has(pathname)) {
      return NextResponse.json(
        { error: "Unsupported media type" },
        { status: 415 },
      );
    }
  }

  const isPublicApiRequest =
    // Pattern-based routes (GET only): these only export GET handlers;
    // restricting at middleware level prevents accidental exposure if a
    // POST/PUT/DELETE handler is added later without adding HMAC.
    (request.method === "GET" &&
      PUBLIC_API_PATTERNS.some((pattern) => pattern.test(pathname))) ||
    // Exact match routes
    PUBLIC_API_EXACT_PATHS.includes(pathname) ||
    // GET-only exact routes (e.g. Logto OIDC): fail closed on other methods
    (request.method === "GET" &&
      PUBLIC_API_GET_EXACT_PATHS.includes(pathname)) ||
    // Event routes (GET only): base, [slug], or /categorized
    (request.method === "GET" && EVENTS_PATTERN.test(pathname)) ||
    // Browser-initiated event deletion (relies on cookie auth + backend creator check)
    (request.method === "DELETE" &&
      /^\/api\/events\/(?!categorized$)[^/]+$/.test(pathname)) ||
    // Image proxy (GET only): used by Next/Image to safely load external images
    (pathname === "/api/image-proxy" && request.method === "GET");

  if (isPublicApiRequest) {
    // For non-GET public routes, verify Origin header matches the site domain.
    // This blocks casual abuse (scripts, bots, cross-site requests) while
    // allowing legitimate browser requests from our frontend.
    // Exempt: webhooks, revalidation, and health checks (server-to-server).
    if (
      request.method !== "GET" &&
      !ORIGIN_CHECK_EXEMPT.has(pathname) &&
      !isOriginAllowed(request)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Endpoints that need visitor_id for idempotency/tracking
    const needsVisitorId =
      pathname === "/api/sponsors/checkout" && request.method === "POST";

    if (needsVisitorId) {
      const cookieVisitor = request.cookies?.get?.("visitor_id")?.value;
      const visitorId =
        cookieVisitor || crypto.randomUUID().replace(/-/g, "");

      // Forward visitor_id via header so route handlers can access it in the same request cycle
      // (cookie set on response won't be available to route handler until next request)
      const apiReqHeaders = new Headers(request.headers);
      apiReqHeaders.set("x-visitor-id", visitorId);

      const response = NextResponse.next({
        request: { headers: apiReqHeaders },
      });
      if (!cookieVisitor) {
        response.cookies.set("visitor_id", visitorId, {
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
          sameSite: "lax",
          secure: !isDev,
        });
      }
      return response;
    }
    return NextResponse.next();
  }
  const hmac = request.headers.get("x-hmac");
  const timestamp = request.headers.get("x-timestamp");
  let requestBody = "";

  if (!process.env.HMAC_SECRET) {
    console.error("HMAC_SECRET is not configured on the server.");
    return new NextResponse("Internal Server Error", { status: 500 });
  }

  // Multipart is handled at the edge of the /api/ branch above (see the
  // narrow allowlist right after `pathname.startsWith("/api/")`). Doing
  // it there means a multipart POST still has to satisfy HMAC unless the
  // path itself is in PUBLIC_API_EXACT_PATHS, AND additionally has to
  // pass the multipart allowlist. Both gates are required.

  try {
    requestBody = await request.clone().text();
  } catch (error) {
    console.error("Could not read request body in middleware:", error);
    return new NextResponse("Bad Request: Unable to read request body", {
      status: 400,
    });
  }

  if (!hmac || !timestamp) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
      },
    );
  }

  if (!validateTimestamp(timestamp)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
      },
    );
  }

  const stringToSign = buildStringToSign(
    requestBody,
    timestamp,
    pathname + request.nextUrl.search,
    request.method,
  );
  const signatureIsValid = await verifyHmacSignature(stringToSign, hmac);

  if (!signatureIsValid) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
      },
    );
  }

  return NextResponse.next();
}

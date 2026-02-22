import { NextRequest, NextResponse } from "next/server";
import { getApiOrigin } from "@utils/api-helpers";
import {
  validateTimestamp,
  buildStringToSign,
  verifyHmacSignature,
} from "@utils/hmac";
import { handleCanonicalRedirects } from "@utils/middleware-redirects";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  type AppLocale,
  SUPPORTED_LOCALES,
} from "types/i18n";
import { stripLocalePrefix } from "@utils/i18n-routing";

const isDev = process.env.NODE_ENV !== "production";
const supportedLocales = new Set<AppLocale>(SUPPORTED_LOCALES);
function parseAcceptLanguage(header: string | null): AppLocale | null {
  if (!header) return null;

  const candidates = header
    .split(",")
    .map((raw) => {
      const [langPart, qValue] = raw.trim().split(";q=");
      const base = langPart.split("-")[0]?.toLowerCase();
      const quality = qValue ? Number.parseFloat(qValue) : 1;
      return {
        base,
        quality: Number.isFinite(quality) ? quality : 0,
      };
    })
    .filter(
      (entry): entry is { base: string; quality: number } =>
        Boolean(entry.base) && entry.quality > 0,
    )
    .sort((a, b) => b.quality - a.quality);

  for (const { base } of candidates) {
    if (supportedLocales.has(base as AppLocale)) {
      return base as AppLocale;
    }
  }

  return null;
}

function getLocaleFromCookie(request: NextRequest): AppLocale | null {
  const cookieLocale = request.cookies?.get?.(LOCALE_COOKIE)?.value;
  if (
    cookieLocale &&
    stripLocalePrefix(`/${cookieLocale}`).locale === cookieLocale
  ) {
    return cookieLocale as AppLocale;
  }
  return null;
}

function persistLocaleCookie(response: NextResponse, locale: AppLocale) {
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
    secure: !isDev,
  });
}

function getCsp() {
  const apiOrigin = getApiOrigin();
  const isVercelPreview =
    process.env.VERCEL_ENV === "preview" ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";
  const adsEnabled =
    process.env.NEXT_PUBLIC_GOOGLE_ADS &&
    String(process.env.NEXT_PUBLIC_GOOGLE_ADS).trim() !== "";

  const cspDirectives = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      // Relaxed policy: allow inline scripts and trusted third-parties
      // This enables ISR/PPR caching while maintaining security through host allowlisting
      "'unsafe-inline'",
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
      "https://www.gstatic.com",
      "https://static.cloudflareinsights.com",
      "https://pagead2.googlesyndication.com",
      "https://*.googlesyndication.com",
      "https://fundingchoicesmessages.google.com",
      "https://*.adtrafficquality.google",
      "https://*.doubleclick.net",
      "https://*.googleadservices.com",
      "https://*.googletagservices.com",
      "https://*.google.com",
      // Vercel preview feedback script
      ...(isVercelPreview ? ["https://vercel.live"] : []),
      // Only include unsafe-eval if ads truly require it
      adsEnabled ? "'unsafe-eval'" : "",
      isDev ? "'unsafe-eval'" : "",
      isDev ? "localhost:*" : "",
      isDev ? "127.0.0.1:*" : "",
    ],
    // Be explicit for browsers that differentiate element/script contexts
    "script-src-elem": [
      "'self'",
      "'unsafe-inline'",
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
      "https://www.gstatic.com",
      "https://static.cloudflareinsights.com",
      "https://pagead2.googlesyndication.com",
      "https://*.googlesyndication.com",
      "https://fundingchoicesmessages.google.com",
      "https://*.adtrafficquality.google",
      "https://*.doubleclick.net",
      "https://*.googleadservices.com",
      "https://*.googletagservices.com",
      "https://*.google.com",
      // Vercel preview feedback script
      ...(isVercelPreview ? ["https://vercel.live"] : []),
      adsEnabled ? "'unsafe-eval'" : "",
      isDev ? "'unsafe-eval'" : "",
      isDev ? "localhost:*" : "",
      isDev ? "127.0.0.1:*" : "",
    ],
    "style-src": [
      "'self'",
      "'unsafe-inline'",
      "https://fonts.googleapis.com",
      "https://fonts.gstatic.com", // Defensive: some edge cases may require this
    ],
    "connect-src": [
      "'self'",
      apiOrigin,
      "https:",
      isDev ? "wss:" : "",
      isDev ? "ws:" : "",
      isDev ? "localhost:*" : "",
      isDev ? "127.0.0.1:*" : "",
    ],
    // Images: allow self, data URIs, HTTPS everywhere; add blob for previews
    // In development, also allow HTTP to ease testing against non-TLS sources
    "img-src": ["'self'", "data:", "https:", "blob:", isDev ? "http:" : ""],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    "media-src": ["'self'", "blob:"],
    "frame-src": ["'self'", "https:"],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'self'"],
  };

  return Object.entries(cspDirectives)
    .map(([key, value]) => `${key} ${value.filter(Boolean).join(" ")}`)
    .join("; ");
}

// Cache CSP string at module load to avoid recomputing on every request
const CACHED_CSP = getCsp();

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
];

// Event routes pattern (GET only): base, [slug], or /categorized
export const EVENTS_PATTERN = /^\/api\/events(\/(categorized|[^/]+))?$/;

// Routes exempt from Origin check (server-to-server callbacks that won't have
// a browser Origin header):
export const ORIGIN_CHECK_EXEMPT = new Set([
  "/api/sponsors/webhook", // Stripe webhook (server-to-server)
  "/api/revalidate", // External revalidation trigger (has own secret)
  "/api/health", // Monitoring probes
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

    const siteHost = new URL(siteUrl || "http://localhost:3000").host;

    // Allow exact host match against configured SITE_URL
    if (originHost === siteHost) return true;

    // Also allow when Origin matches the request's own Host header.
    // This handles preview/staging deployments where the URL differs
    // from NEXT_PUBLIC_SITE_URL (e.g. Amplify preview branches).
    const requestHost = request.headers.get("host");
    if (requestHost && originHost === requestHost) return true;

    // In development, also allow localhost variants
    if (
      isDev &&
      (originHost.startsWith("localhost") || originHost.startsWith("127.0.0.1"))
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const search = request.nextUrl.search;

  if (pathname.startsWith("/api/")) {
    const isPublicApiRequest =
      // Pattern-based routes (GET only): these only export GET handlers;
      // restricting at middleware level prevents accidental exposure if a
      // POST/PUT/DELETE handler is added later without adding HMAC.
      (request.method === "GET" &&
        PUBLIC_API_PATTERNS.some((pattern) => pattern.test(pathname))) ||
      // Exact match routes
      PUBLIC_API_EXACT_PATHS.includes(pathname) ||
      // Event routes (GET only): base, [slug], or /categorized
      (request.method === "GET" && EVENTS_PATTERN.test(pathname)) ||
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
    const contentType = request.headers.get("content-type") || "";
    let requestBody = "";

    if (!process.env.HMAC_SECRET) {
      console.error("HMAC_SECRET is not configured on the server.");
      return new NextResponse("Internal Server Error", { status: 500 });
    }

    if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
      try {
        requestBody = await request.clone().text();
      } catch (error) {
        console.error("Could not read request body in middleware:", error);
        return new NextResponse("Bad Request: Unable to read request body", {
          status: 400,
        });
      }
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

  if (pathname === "/sw.js") {
    const response = NextResponse.next();
    // Avoid no-store here so bfcache isn't blocked by this request
    response.headers.set(
      "Cache-Control",
      "no-cache, max-age=0, must-revalidate",
    );
    response.headers.set("Service-Worker-Allowed", "/");
    return response;
  }

  const { locale: localeFromPath, pathnameWithoutLocale } =
    stripLocalePrefix(pathname);
  const localeFromCookie = getLocaleFromCookie(request);

  if (localeFromPath === DEFAULT_LOCALE) {
    const redirectUrl = new URL(
      `${pathnameWithoutLocale}${search || ""}`,
      request.url,
    );
    const response = NextResponse.redirect(redirectUrl, 308);
    persistLocaleCookie(response, DEFAULT_LOCALE);
    return response;
  }

  if (!localeFromPath && pathname === "/") {
    const preferredLocale =
      localeFromCookie ||
      parseAcceptLanguage(request.headers.get("accept-language"));
    if (preferredLocale && preferredLocale !== DEFAULT_LOCALE) {
      const redirectUrl = new URL(
        `/${preferredLocale}${search || ""}`,
        request.url,
      );
      const response = NextResponse.redirect(redirectUrl, 302);
      persistLocaleCookie(response, preferredLocale);
      return response;
    }
  }

  const resolvedLocale: AppLocale = localeFromPath ?? DEFAULT_LOCALE;
  const shouldPersistLocaleFromPath =
    Boolean(localeFromPath) && localeFromPath !== localeFromCookie;

  // Handle canonical redirects for place routes
  const redirectResponse = handleCanonicalRedirects(request);
  if (redirectResponse) {
    if (shouldPersistLocaleFromPath && localeFromPath) {
      persistLocaleCookie(redirectResponse, localeFromPath);
    }
    return redirectResponse;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("x-next-intl-locale", resolvedLocale);

  // No per-page visitor id injection; handled only for /api/sponsors/checkout.

  const baseResponseInit = {
    request: {
      headers: requestHeaders,
    },
  };

  // When a locale prefix exists (e.g., /es/...), rewrite to the locale-stripped
  // pathname for routing while preserving the original URL in the browser.
  // This keeps locale-prefixed URLs indexable and allows us to reuse the
  // existing route tree without duplicating files.
  const response = localeFromPath
    ? (() => {
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = pathnameWithoutLocale || "/";
        // Avoid RSC/data cache collisions between locales by making the rewritten
        // request URL vary per locale while keeping the visible URL unchanged.
        rewriteUrl.searchParams.set("__locale", resolvedLocale);
        return NextResponse.rewrite(rewriteUrl, baseResponseInit);
      })()
    : NextResponse.next(baseResponseInit);

  if (shouldPersistLocaleFromPath && localeFromPath) {
    persistLocaleCookie(response, localeFromPath);
  }

  // visitor_id cookie is set for /api/sponsors/checkout if missing.

  // Use Report-Only in preview (or when explicitly requested), enforce otherwise
  const reportOnly =
    process.env.NEXT_PUBLIC_CSP_REPORT_ONLY === "1" ||
    process.env.VERCEL_ENV === "preview" ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";
  if (reportOnly) {
    response.headers.set("Content-Security-Policy-Report-Only", CACHED_CSP);
  } else {
    response.headers.set("Content-Security-Policy", CACHED_CSP);
  }
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self)",
  );

  // Cache-Control for public HTML pages (excluding API and Next assets).
  //
  // s-maxage=1800 (30 min): Cultural events are published days in advance, so
  // 30 min staleness is invisible to users. With stale-while-revalidate, CloudFront
  // serves the cached page instantly and revalidates in the background — the next
  // visitor gets fresh data. This raises CloudFront cache-hit ratio from ~3.6%
  // to ~20-30%, reducing Lambda invocations significantly.
  //
  // Browser cache is set to 0 so users revalidate on navigation, but CDNs can
  // still serve quickly and revalidate in the background.
  if (!pathname.startsWith("/api/") && !pathname.startsWith("/_next/")) {
    const normalizedPath = pathnameWithoutLocale || pathname;
    const isFavoritesPage = normalizedPath === "/preferits";
    const isPersonalizedHtml = isFavoritesPage;

    response.headers.set(
      "Cache-Control",
      isPersonalizedHtml
        ? "private, no-store"
        : "public, max-age=0, s-maxage=1800, stale-while-revalidate=1800",
    );
  }

  // Set Content-Language header for SEO and accessibility
  response.headers.set("Content-Language", resolvedLocale);

  // SEO: Add X-Robots-Tag for filtered listing pages (search, distance, lat, lon)
  // This prevents indexing of filtered/personalized URLs without making pages dynamic
  const NON_CANONICAL_PARAMS = ["search", "distance", "lat", "lon"];
  const hasNonCanonicalParams = NON_CANONICAL_PARAMS.some((param) => {
    const value = request.nextUrl.searchParams.get(param);
    return value !== null && value.trim().length > 0;
  });

  // Hidden tool pages that should never be indexed by crawlers
  const NOINDEX_PATHS = ["/compartir-tiktok", "/callback"];
  const isNoindexPath = NOINDEX_PATHS.some((p) =>
    (pathnameWithoutLocale || pathname).startsWith(p),
  );

  if (isNoindexPath) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  } else if (hasNonCanonicalParams) {
    response.headers.set("X-Robots-Tag", "noindex, follow");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next|favicon.ico|robots.txt|sitemap.*\\.xml|ads.txt|static|styles|\\.well-known|manifest\\.webmanifest).*)",
  ],
};

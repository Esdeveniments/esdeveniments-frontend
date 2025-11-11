import { NextRequest, NextResponse } from "next/server";
import { getApiOrigin } from "@utils/api-helpers";
import {
  validateTimestamp,
  buildStringToSign,
  verifyHmacSignature,
} from "@utils/hmac";
import { isValidDateSlug } from "@lib/dates";

const isDev = process.env.NODE_ENV !== "production";

function getCsp(nonce: string) {
  const apiOrigin = getApiOrigin();

  const cspDirectives = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      isDev ? "'unsafe-eval'" : "",
      isDev ? "localhost:*" : "",
      isDev ? "127.0.0.1:*" : "",
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
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
    "font-src": ["'self'"],
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

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    // Allowlist public API routes that don't require HMAC from the browser
    // Routes that accept both base path and sub-paths
    const publicApiPrefixes = [
      "/api/regions",
      "/api/categories",
      "/api/cities",
      "/api/news",
      "/api/places",
    ];

    // Routes that require exact match (not covered by prefix patterns)
    const publicApiExactPaths = [
      "/api/promotions/config",
      "/api/promotions/price-preview",
      "/api/leads/restaurant",
      "/api/stripe/checkout",
      "/api/cloudinary/sign",
    ];

    const isPublicApiRequest =
      // Prefix-based routes (base path or any sub-path)
      publicApiPrefixes.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
      ) ||
      // Exact match routes
      publicApiExactPaths.includes(pathname) ||
      // Event routes (GET only)
      (pathname.startsWith("/api/events") && request.method === "GET") ||
      // Visit counter endpoint (POST only)
      (pathname === "/api/visits" && request.method === "POST");

    if (isPublicApiRequest) {
      // Special case: visits endpoint should receive/stamp visitor id
      if (pathname === "/api/visits" && request.method === "POST") {
        const apiReqHeaders = new Headers(request.headers);
        const cookieVisitor = request.cookies.get("visitor_id")?.value;
        const visitorId =
          cookieVisitor || crypto.randomUUID().replace(/-/g, "");
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
      return new NextResponse("Unauthorized", {
        status: 401,
      });
    }

    if (!validateTimestamp(timestamp)) {
      return new NextResponse("Unauthorized", {
        status: 401,
      });
    }

    const stringToSign = buildStringToSign(
      requestBody,
      timestamp,
      pathname + request.nextUrl.search,
      request.method
    );
    const signatureIsValid = await verifyHmacSignature(stringToSign, hmac);

    if (!signatureIsValid) {
      return new NextResponse(`Unauthorized`, {
        status: 401,
      });
    }

    return NextResponse.next();
  }

  if (pathname === "/sw.js") {
    const response = NextResponse.next();
    // Avoid no-store here so bfcache isn't blocked by this request
    response.headers.set(
      "Cache-Control",
      "no-cache, max-age=0, must-revalidate"
    );
    response.headers.set("Service-Worker-Allowed", "/");
    return response;
  }

  const segments = pathname.split("/").filter(Boolean);
  const searchParams = request.nextUrl.searchParams;
  const queryCategory = searchParams.get("category");
  const queryDate = searchParams.get("date");

  // Redirect /tots in segments (e.g., /barcelona/tots → /barcelona)
  if (
    (segments.length === 3 || segments.length === 2) &&
    segments[1] === "tots"
  ) {
    const newPath =
      segments.length === 3
        ? `/${segments[0]}/${segments[2]}`
        : `/${segments[0]}`;
    const remainingParams = new URLSearchParams(searchParams);
    remainingParams.delete("category");
    remainingParams.delete("date");
    const remainingQuery = remainingParams.toString();
    const finalUrl = remainingQuery ? `${newPath}?${remainingQuery}` : newPath;
    return NextResponse.redirect(new URL(finalUrl, request.url), 301);
  }

  // Redirect query params for category/date to canonical URLs (e.g., /barcelona?category=teatre&date=tots → /barcelona/teatre)
  // This prevents CSP errors by redirecting before page renders
  if (queryCategory || queryDate) {
    const place = segments[0] || "catalunya";
    const segmentCount = segments.length;

    // Only handle redirects for 1-segment URLs (e.g., /barcelona?category=teatre)
    // 2-segment URLs are handled by page components (they may be valid canonical URLs)
    // Skip known non-place top-level routes
    const firstSegment = segments[0] || "";
    const nonPlaceFirstSegments = new Set([
      "noticies",
      "publica",
      "login",
      "offline",
      "e",
      "sitemap",
      "rss.xml",
      "qui-som",
      "server-sitemap.xml",
      "server-news-sitemap.xml",
      "server-google-news-sitemap.xml",
    ]);

    if (segmentCount === 1 && !nonPlaceFirstSegments.has(firstSegment)) {
      // Build canonical URL: omit "tots" values
      let canonicalPath = `/${place}`;
      const date =
        queryDate && isValidDateSlug(queryDate)
          ? queryDate === "tots"
            ? null
            : queryDate
          : null;
      const category = queryCategory === "tots" ? null : queryCategory;

      if (date && category) {
        // Both specific: /place/date/category
        canonicalPath = `/${place}/${date}/${category}`;
      } else if (date) {
        // Only date: /place/date
        canonicalPath = `/${place}/${date}`;
      } else if (category) {
        // Only category: /place/category
        canonicalPath = `/${place}/${category}`;
      }
      // If both are "tots" or null, canonicalPath stays as /place

      // Preserve other query params (search, distance, lat, lon)
      const remainingParams = new URLSearchParams(searchParams);
      remainingParams.delete("category");
      remainingParams.delete("date");
      const remainingQuery = remainingParams.toString();
      const finalUrl = remainingQuery
        ? `${canonicalPath}?${remainingQuery}`
        : canonicalPath;

      return NextResponse.redirect(new URL(finalUrl, request.url), 301);
    }
  }

  const nonce = crypto.randomUUID();
  const csp = getCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-pathname", pathname);

  // No per-page visitor id injection; handled only for /api/visits.

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // visitor_id cookie is set only when calling /api/visits if missing.

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self)"
  );

  return response;
}

export const config = {
  matcher: [
    "/((?!_next|favicon.ico|robots.txt|sitemap\\.xml|ads.txt|static|styles).*)",
  ],
};

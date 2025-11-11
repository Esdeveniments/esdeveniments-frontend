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
  const searchParams =
    (request.nextUrl as any).searchParams instanceof URLSearchParams
      ? ((request.nextUrl as any).searchParams as URLSearchParams)
      : new URLSearchParams((request.nextUrl as any).search || "");
  const queryCategory = searchParams.get("category");
  const queryDate = searchParams.get("date");

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

  // Only process redirects for place routes
  if (nonPlaceFirstSegments.has(firstSegment)) {
    // Continue to normal processing for non-place routes
  } else {
    const place = segments[0] || "catalunya";
    const segmentCount = segments.length;
    const hasTotsInSegments =
      (segmentCount === 3 || segmentCount === 2) && segments[1] === "tots";

    // Handle redirects: combine /tots segments with query params if present
    if (
      hasTotsInSegments ||
      (segmentCount === 1 && (queryCategory || queryDate))
    ) {
      // Build canonical URL: omit "tots" values
      let canonicalPath = `/${place}`;

      // Determine date: from segment (if not tots) or query param
      let date: string | null = null;
      if (hasTotsInSegments && segmentCount === 3) {
        // /place/tots/category - date is "tots" (omitted)
        date = null;
      } else if (segmentCount === 2 && segments[1] !== "tots") {
        // /place/date - check if it's a valid date
        const secondSegment = segments[1];
        date =
          isValidDateSlug(secondSegment) && secondSegment !== "tots"
            ? secondSegment
            : null;
      } else if (
        queryDate &&
        isValidDateSlug(queryDate) &&
        queryDate !== "tots"
      ) {
        date = queryDate;
      }

      // Determine category: from segment (if not tots) or query param
      let category: string | null = null;
      if (hasTotsInSegments && segmentCount === 3) {
        // /place/tots/category - category is in third segment
        category = segments[2] !== "tots" ? segments[2] : null;
      } else if (segmentCount === 2 && segments[1] !== "tots") {
        // /place/X - check if X is a category (not a date)
        const secondSegment = segments[1];
        if (!isValidDateSlug(secondSegment)) {
          category = secondSegment !== "tots" ? secondSegment : null;
        }
      } else if (queryCategory && queryCategory !== "tots") {
        category = queryCategory;
      }

      // Build canonical path based on date and category
      if (date && category) {
        canonicalPath = `/${place}/${date}/${category}`;
      } else if (date) {
        canonicalPath = `/${place}/${date}`;
      } else if (category) {
        canonicalPath = `/${place}/${category}`;
      }
      // If both are null/tots, canonicalPath stays as /place

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

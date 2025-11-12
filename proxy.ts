import { NextRequest, NextResponse } from "next/server";
import { getApiOrigin } from "@utils/api-helpers";
import {
  validateTimestamp,
  buildStringToSign,
  verifyHmacSignature,
} from "@utils/hmac";
import { handleCanonicalRedirects } from "@utils/middleware-redirects";

const isDev = process.env.NODE_ENV !== "production";

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
    // Use regex patterns for precise matching to prevent accidental exposure of
    // deep nested private routes (e.g., /api/regions/admin/users would be blocked).
    // Note: Single-segment routes like /api/regions/admin are still allowed to
    // support dynamic routes like [id] and [slug], but routes must be explicitly
    // created as files in the codebase.
    const publicApiPatterns = [
      // Regions: base, [id], or /options
      /^\/api\/regions(\/(options|[\w-]+))?$/,
      // Categories: base or [id]
      /^\/api\/categories(\/[\w-]+)?$/,
      // Cities: base or [id]
      /^\/api\/cities(\/[\w-]+)?$/,
      // News: base or [slug]
      /^\/api\/news(\/[\w-]+)?$/,
      // Places: base, [slug], /nearby, or /photo
      /^\/api\/places(\/(nearby|photo|[\w-]+))?$/,
    ];

    // Routes that require exact match
    const publicApiExactPaths = [
      "/api/promotions/config",
      "/api/promotions/price-preview",
      "/api/promotions/active",
      "/api/leads/restaurant",
      "/api/stripe/checkout",
      "/api/cloudinary/sign",
    ];

    const isPublicApiRequest =
      // Pattern-based routes (base path, dynamic segments, or specific sub-paths)
      publicApiPatterns.some((pattern) => pattern.test(pathname)) ||
      // Exact match routes
      publicApiExactPaths.includes(pathname) ||
      // Event routes (GET only): base, [slug], or /categorized
      (request.method === "GET" &&
        /^\/api\/events(\/(categorized|[\w-]+))?$/.test(pathname)) ||
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

  // Handle canonical redirects for place routes
  const redirectResponse = handleCanonicalRedirects(request);
  if (redirectResponse) {
    return redirectResponse;
  }

  const csp = getCsp();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  // No per-page visitor id injection; handled only for /api/visits.

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // visitor_id cookie is set only when calling /api/visits if missing.

  // Use Report-Only in preview (or when explicitly requested), enforce otherwise
  const reportOnly =
    process.env.NEXT_PUBLIC_CSP_REPORT_ONLY === "1" ||
    process.env.VERCEL_ENV === "preview" ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";
  if (reportOnly) {
    response.headers.set("Content-Security-Policy-Report-Only", csp);
  } else {
    response.headers.set("Content-Security-Policy", csp);
  }
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
    "/((?!_next|favicon.ico|robots.txt|sitemap\\.xml|ads.txt|static|styles|\\.well-known|manifest\\.webmanifest).*)",
  ],
};

import { NextRequest, NextResponse } from "next/server";
import { getApiOrigin } from "@utils/api-helpers";
import {
  validateTimestamp,
  buildStringToSign,
  verifyHmacSignature,
} from "@utils/hmac";

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
    "img-src": ["'self'", "data:", "https:"],
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    // Allowlist public API routes that don't require HMAC from the browser
    if (
      pathname === "/api/regions/options" ||
      pathname === "/api/promotions/config" ||
      pathname === "/api/promotions/price-preview" ||
      pathname === "/api/categories" ||
      pathname === "/api/leads/restaurant" ||
      pathname === "/api/stripe/checkout" ||
      pathname === "/api/cloudinary/sign" ||
      pathname === "/api/places/nearby" ||
      pathname === "/api/places/photo" ||
      // Public proxy for events list used by client SWR (GET only)
      (pathname === "/api/events" && request.method === "GET")
    ) {
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
    response.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate"
    );
    response.headers.set("Service-Worker-Allowed", "/");
    return response;
  }

  const segments = pathname.split("/").filter(Boolean);
  if (
    (segments.length === 3 || segments.length === 2) &&
    segments[1] === "tots"
  ) {
    const newPath =
      segments.length === 3
        ? `/${segments[0]}/${segments[2]}`
        : `/${segments[0]}`;
    const searchParams = request.nextUrl.searchParams.toString();
    const finalUrl = searchParams ? `${newPath}?${searchParams}` : newPath;
    return NextResponse.redirect(new URL(finalUrl, request.url), 301);
  }

  const nonce = crypto.randomUUID();
  const csp = getCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-pathname", pathname);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

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

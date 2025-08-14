import { NextRequest, NextResponse } from "next/server";

// Determine if the environment is development
const isDev = process.env.NODE_ENV !== "production";

// Get API origin with multiple fallback strategies for Edge Runtime
// Edge Runtime has limitations with environment variables
const getApiOrigin = () => {
  // Strategy 1: Try environment variable (works in most cases)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (apiUrl) {
    try {
      return new URL(apiUrl).origin;
    } catch {
      console.warn("Invalid NEXT_PUBLIC_API_URL format:", apiUrl);
    }
  }

  // Strategy 2: Fallback based on NODE_ENV
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === "production") {
    return "https://api.esdeveniments.cat"; // Production API
  }

  // Strategy 3: Default fallback (development/staging)
  return "https://api-pre.esdeveniments.cat";
};

/**
 * Generates a balanced and maintainable Content Security Policy.
 * @param nonce - A unique string for the 'nonce-' directive.
 * @returns The CSP string.
 */
function getCsp(nonce: string) {
  const apiOrigin = getApiOrigin();

  const cspDirectives = {
    // By default, only allow resources from our own domain.
    "default-src": ["'self'"],

    // --- SCRIPT SECURITY (The Most Important Part) ---
    // This is the gold standard. It ensures only scripts with a nonce can run.
    // 'strict-dynamic' allows a trusted script to load other scripts,
    // which is essential for services like Google Ads and Analytics.
    // This avoids having to whitelist every single Google domain for scripts.
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      isDev ? "'unsafe-eval'" : "", // For Next.js Fast Refresh in dev
      isDev ? "localhost:*" : "", // Allow localhost scripts in dev for Next.js chunks
      isDev ? "127.0.0.1:*" : "", // Allow 127.0.0.1 scripts in dev for Next.js chunks
    ],

    // --- STYLE SECURITY ---
    "style-src": ["'self'", "'unsafe-inline'"],

    // --- OTHER RESOURCES (More Flexible for Maintainability) ---
    // Instead of whitelisting every domain, we allow connections to any secure (https) source.
    // This prevents services from breaking if they change their endpoints.
    "connect-src": [
      "'self'",
      apiOrigin, // Dynamic external API based on environment
      "https:", // Allows any HTTPS connection
      isDev ? "wss:" : "", // For Next.js Fast Refresh in dev
      isDev ? "ws:" : "", // For Next.js Fast Refresh in dev (non-secure)
      isDev ? "localhost:*" : "", // Allow localhost connections in dev
      isDev ? "127.0.0.1:*" : "", // Allow 127.0.0.1 connections in dev
    ],
    "img-src": ["'self'", "data:", "https:"], // Allows any HTTPS image
    "font-src": ["'self'"],
    "frame-src": ["'self'", "https:"], // Allows any HTTPS iframe

    // --- LOCKDOWN DIRECTIVES (Hardening) ---
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'self'"],
  };

  // Convert to a compact CSP string, filtering out empty entries
  const csp = Object.entries(cspDirectives)
    .map(([key, value]) => {
      const filtered = Array.isArray(value)
        ? value.filter(Boolean)
        : ([value].filter(Boolean) as string[]);
      return `${key} ${filtered.join(" ")}`;
    })
    .join("; ");

  return csp;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Handle Service Worker ---
  // Apply specific caching headers for the service worker and return early.
  if (pathname === "/sw.js") {
    const response = NextResponse.next();
    response.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate"
    );
    response.headers.set("Service-Worker-Allowed", "/");
    return response;
  }

  // --- Protect dashboard routes (server-side cookie) ---
  if (pathname.startsWith("/dashboard")) {
    const hasSession = request.cookies.get("session");
    if (!hasSession) {
      const loginUrl = new URL("/auth/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // --- Handle Redirects ---
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

  // --- Generate and Apply Security Headers for all other pages ---
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
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next (Next.js internal files)
     * - favicon.ico (favicon file)
     * - robots.txt, sitemap.xml, ads.txt (SEO files)
     * - static (static assets)
     * - styles (CSS files)
     * - sw.js (service worker)
     */
    "/((?!api|_next|favicon.ico|robots.txt|sitemap\\.xml|ads.txt|static|styles|sw\\.js).*)",
  ],
};

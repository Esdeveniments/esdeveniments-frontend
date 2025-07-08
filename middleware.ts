import { NextRequest, NextResponse } from "next/server";

// Determine if the environment is development
const isDev = process.env.NODE_ENV !== "production";

/**
 * Generates a balanced and maintainable Content Security Policy.
 * @param nonce - A unique string for the 'nonce-' directive.
 * @returns The CSP string.
 */
function getCsp(nonce: string) {
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
    ],

    // --- STYLE SECURITY ---
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],

    // --- OTHER RESOURCES (More Flexible for Maintainability) ---
    // Instead of whitelisting every domain, we allow connections to any secure (https) source.
    // This prevents services from breaking if they change their endpoints.
    "connect-src": [
      "'self'",
      "https:", // Allows any HTTPS connection
      isDev ? "wss:" : "", // For Next.js Fast Refresh in dev
    ],
    "img-src": ["'self'", "data:", "https:"], // Allows any HTTPS image
    "font-src": ["'self'", "https://fonts.gstatic.com"],
    "frame-src": ["'self'", "https:"], // Allows any HTTPS iframe

    // --- LOCKDOWN DIRECTIVES (Hardening) ---
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"], // Disallow plugins like Flash
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'self'"], // Prevents clickjacking

    // 'report-uri': 'YOUR_SENTRY_REPORTING_ENDPOINT',
  };

  return Object.entries(cspDirectives)
    .map(([key, value]) => `${key} ${value.filter(Boolean).join(" ")}`)
    .join("; ");
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
    "camera=(), microphone=(), geolocation=()"
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

import type { NextResponse } from "next/server";
import { getApiOrigin } from "@utils/api-helpers";
import { isDev } from "@utils/api-gate";

// CSP for HTML pages. Relaxed host allowlist with 'unsafe-inline' and no
// nonces, so pages stay cacheable (ISR/PPR); nonces force dynamic rendering.
// The other security headers are static and live in next.config.js headers().

const isVercelPreview =
  process.env.VERCEL_ENV === "preview" ||
  process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";

function buildCsp(): string {
  const adsEnabled = Boolean(process.env.NEXT_PUBLIC_GOOGLE_ADS?.trim());

  // One list for script-src and script-src-elem: a host missing from either
  // one is blocked by browsers that check element scripts separately.
  const scriptSources = [
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
    isVercelPreview ? "https://vercel.live" : "",
    // AdSense needs eval; dev needs it for React Refresh.
    adsEnabled || isDev ? "'unsafe-eval'" : "",
    isDev ? "localhost:*" : "",
    isDev ? "127.0.0.1:*" : "",
  ];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": scriptSources,
    "script-src-elem": scriptSources,
    "style-src": [
      "'self'",
      "'unsafe-inline'",
      "https://fonts.googleapis.com",
      "https://fonts.gstatic.com",
    ],
    "connect-src": [
      "'self'",
      getApiOrigin(),
      "https:",
      isDev ? "wss:" : "",
      isDev ? "ws:" : "",
      isDev ? "localhost:*" : "",
      isDev ? "127.0.0.1:*" : "",
    ],
    // In development, also allow HTTP to ease testing against non-TLS sources
    "img-src": ["'self'", "data:", "https:", "blob:", isDev ? "http:" : ""],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    "media-src": ["'self'", "blob:"],
    "frame-src": ["'self'", "https:"],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    // Keep in sync with X-Frame-Options in next.config.js
    "frame-ancestors": ["'self'"],
  };

  return Object.entries(directives)
    .map(([key, value]) => `${key} ${value.filter(Boolean).join(" ")}`)
    .join("; ");
}

// Built once per process: every input is fixed at build or boot time.
const CSP_VALUE = buildCsp();
// Report-Only to trial a stricter policy (or on a Vercel preview).
const CSP_HEADER =
  process.env.NEXT_PUBLIC_CSP_REPORT_ONLY === "1" || isVercelPreview
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";

export function applyCsp(response: NextResponse): void {
  response.headers.set(CSP_HEADER, CSP_VALUE);
}

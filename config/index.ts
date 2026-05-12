import { normalizeHost } from "@utils/host-validation";
import type { SocialLinks } from "types/common";

/**
 * Get the site URL based on the environment
 * @returns The appropriate site URL for localhost, preview/development, or production
 */
export function getSiteUrl(): string {
  // Priority 1: Explicitly set site URL (Coolify/custom deployments)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // Priority 2: Vercel deployments
  if (
    process.env.NEXT_PUBLIC_VERCEL_ENV === "preview" ||
    process.env.NEXT_PUBLIC_VERCEL_ENV === "development"
  ) {
    return "https://esdeveniments.vercel.app";
  }

  // Priority 3: Development (non-production)
  if (process.env.NODE_ENV !== "production") {
    const port = process.env.PORT || "3000";
    return `http://localhost:${port}`;
  }

  // Priority 4: Production fallback
  return "https://www.esdeveniments.cat";
}

/**
 * Check if a hostname is an internal/private address that should never be
 * used as a public-facing URL. Covers Docker bind addresses (0.0.0.0),
 * loopback (127.x, ::1), RFC 1918 private ranges (10.x, 172.16-31.x, 192.168.x),
 * link-local (169.254.x), multicast/reserved ranges, and common container hostnames.
 *
 * Coolify/Docker context: HOSTNAME=0.0.0.0 is the bind address for the container.
 * Next.js reflects this in nextUrl.host when no proxy headers override it.
 */
function isInternalHost(host: string): boolean {
  const hostname = normalizeHost(host);

  // Loopback, unspecified, and common dev names
  if (
    hostname === "localhost" ||
    hostname === "metadata.google.internal" ||
    hostname === "0.0.0.0" ||
    hostname === "::" ||
    hostname === "::1"
  ) {
    return true;
  }

  // IPv4 private/reserved ranges
  // 127.x.x.x (loopback), 10.x.x.x, 192.168.x.x, 172.16-31.x.x, 169.254.x.x (link-local),
  // 100.64-127.x.x (carrier-grade NAT), 192.0.0.x / documentation ranges,
  // 198.18-19.x.x (benchmarking), 224-239.x.x (multicast), 240-255.x.x (reserved).
  if (
    /^0\./.test(hostname) ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    /^169\.254\./.test(hostname) ||
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(hostname) ||
    /^192\.0\.0\./.test(hostname) ||
    /^192\.0\.2\./.test(hostname) ||
    /^198\.(1[89])\./.test(hostname) ||
    /^198\.51\.100\./.test(hostname) ||
    /^203\.0\.113\./.test(hostname) ||
    /^(22[4-9]|23\d)\./.test(hostname) ||
    /^(24\d|25[0-5])\./.test(hostname)
  ) {
    return true;
  }

  // IPv6 private, link-local, multicast, and IPv4-mapped loopback/private forms.
  if (hostname.includes(":")) {
    if (
      hostname.startsWith("fc") ||
      hostname.startsWith("fd") ||
      hostname.startsWith("fe80") ||
      hostname.startsWith("ff") ||
      hostname.startsWith("::ffff:127.") ||
      hostname.startsWith("::ffff:10.") ||
      hostname.startsWith("::ffff:192.168.") ||
      /^::ffff:172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
      hostname.startsWith("::ffff:169.254.")
    ) {
      return true;
    }
  }

  // Infrastructure domains that aren't the real public host
  if (
    hostname.endsWith(".cloudfront.net") ||
    hostname.includes(".lambda-url.") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local")
  ) {
    return true;
  }

  return false;
}

/**
 * Get the site URL from a request, falling back to environment-based detection.
 * Prefers the actual request host for accuracy, especially in production.
 * Handles reverse proxy environments by checking multiple header sources.
 * @param request - Optional NextRequest to extract host from
 * @returns The site URL (with protocol)
 */
export function getSiteUrlFromRequest(request?: {
  nextUrl?: { protocol?: string; host?: string };
  headers?: Headers;
}): string {
  // If request is provided, try to extract URL from request host
  if (request) {
    const requestUrl = request.nextUrl;
    const headers = request.headers;

    // Determine protocol (default to https for production)
    const protocol = requestUrl?.protocol || "https:";

    // Try multiple sources for host (reverse proxy environments)
    // Priority: nextUrl.host > x-forwarded-host > host header
    const host =
      requestUrl?.host ||
      headers?.get("x-forwarded-host") ||
      headers?.get("host");

    if (host) {
      const internal = isInternalHost(host);

      // Allow internal hosts ONLY in development mode
      if (!internal || process.env.NODE_ENV === "development") {
        // Normalize 127.0.0.1 to localhost in development for consistency
        const normalizedHost =
          process.env.NODE_ENV === "development" && host.includes("127.0.0.1")
            ? host.replace("127.0.0.1", "localhost")
            : host;
        return `${protocol}//${normalizedHost}`;
      }
    }
  }

  // Fallback to environment-based detection
  // In production, NEXT_PUBLIC_SITE_URL is set to "https://www.esdeveniments.cat"
  return getSiteUrl();
}

// Export for testing
export { isInternalHost };

// Keep the const for backward compatibility
export const siteUrl = getSiteUrl();

// Central contact email used across UI (defaults to esdeveniments inbox)
export const contactEmail =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hola@esdeveniments.cat";

/** Canonical social media links — single source of truth for footer, schema, popups. */
export const socialLinks: SocialLinks = {
  web: "https://www.esdeveniments.cat",
  twitter: "https://x.com/esdeveniments_",
  instagram: "https://www.instagram.com/esdeveniments.cat",
  telegram: "https://t.me/esdeveniments",
  facebook: "https://www.facebook.com/esdeveniments.cat",
  threads: "https://www.threads.com/@esdeveniments.cat",
  linkedin: "https://www.linkedin.com/company/esdeveniments-cat",
  // tiktok: "https://www.tiktok.com/@esdeveniments",
  mastodon: "https://mastodon.social/@esdeveniments",
};

/** Social links for JSON-LD sameAs (excludes web, telegram). */
export const socialLinksSameAs: string[] = [
  socialLinks.facebook,
  socialLinks.instagram,
  // socialLinks.tiktok,
  socialLinks.twitter,
  socialLinks.threads,
  socialLinks.mastodon,
  socialLinks.linkedin,
  "https://github.com/esdeveniments",
  "https://www.wikidata.org/wiki/Q139549463",
];

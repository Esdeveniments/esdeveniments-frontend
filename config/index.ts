/**
 * Get the site URL based on the environment
 * @returns The appropriate site URL for localhost, preview/development, or production
 */
export function getSiteUrl(): string {
  // Priority 1: Explicitly set site URL (SST deployments, custom configs)
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
    return "http://localhost:3000";
  }

  // Priority 4: Production fallback
  return "https://www.esdeveniments.cat";
}

/**
 * Get the site URL from a request, falling back to environment-based detection.
 * Prefers the actual request host for accuracy, especially in production.
 * Handles CloudFront/edge environments by checking multiple header sources.
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

    // Try multiple sources for host (CloudFront/edge environments)
    // Priority: nextUrl.host > x-forwarded-host > host header
    const host =
      requestUrl?.host ||
      headers?.get("x-forwarded-host") ||
      headers?.get("host");

    // Use request host if available
    // Allow localhost ONLY in development mode
    const isLocalhost =
      host?.includes("localhost") || host?.includes("127.0.0.1");

    if (
      host &&
      (!isLocalhost || process.env.NODE_ENV === "development") &&
      !host.includes(".cloudfront.net") && // Avoid CloudFront distribution domains
      !host.includes(".lambda-url.") // Avoid Lambda function URLs
    ) {
      // Normalize 127.0.0.1 to localhost in development for consistency
      const normalizedHost =
        process.env.NODE_ENV === "development" && host.includes("127.0.0.1")
          ? host.replace("127.0.0.1", "localhost")
          : host;
      return `${protocol}//${normalizedHost}`;
    }
  }

  // Fallback to environment-based detection
  // In SST, NEXT_PUBLIC_SITE_URL is set to "https://www.esdeveniments.cat"
  return getSiteUrl();
}

// Keep the const for backward compatibility
export const siteUrl = getSiteUrl();

// Central contact email used across UI (defaults to esdeveniments inbox)
export const contactEmail =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hola@esdeveniments.cat";

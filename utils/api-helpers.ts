/**
 * Shared API utilities for consistent origin resolution across middleware and layout
 * Follows the same fallback strategy as middleware.ts for edge runtime compatibility
 */

import { getSiteUrl } from "@config/index";
import type { FetchEventsParams } from "types/event";
import { distanceToRadius } from "types/event";
import type { FetchNewsParams } from "@lib/api/news";
import type { HeadersFn } from "types/utils";

// Conditionally import headers - only available in server components/route handlers
// Using dynamic require to avoid build-time errors when headers() is not available

let headersFn: HeadersFn | null = null;
try {
  // Dynamic require is safe here - we catch errors if headers() is unavailable
  const headersModule = require("next/headers") as { headers: HeadersFn };
  headersFn = headersModule.headers;
} catch {
  // headers() not available (e.g., during build or in client context)
  headersFn = null;
}

/**
 * Get API origin with multiple fallback strategies for Edge Runtime
 * Edge runtime has limitations with environment variables
 */
export function getApiOrigin(): string {
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
    return "https://api-pre.esdeveniments.cat"; // Production API
  }

  // Strategy 3: Default fallback (development/staging)
  return "https://api-pre.esdeveniments.cat";
}

/**
 * Optional Vercel Deployment Protection bypass header.
 *
 * When Deployment Protection is enabled, server-side fetches to the same deployment
 * (e.g. calling internal API routes via an absolute URL) will not automatically
 * include the browser's Vercel auth cookies.
 *
 * If a Protection Bypass secret is configured in Vercel, attaching this header
 * allows SSR/ISR requests to reach internal routes.
 */
export function getVercelProtectionBypassHeaders(): Record<string, string> {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!secret) return {};
  return { "x-vercel-protection-bypass": secret };
}

/**
 * Build an absolute URL to the app's own API routes (App Router `/api/*`).
 * This is necessary when running without a request context (e.g., during build
 * or static generation), where relative URLs are invalid in Node's fetch.
 *
 * In Vercel preview deployments, this function will use the request host header
 * when available to ensure the correct preview URL is used.
 */
export async function getInternalApiUrl(path: string): Promise<string> {
  const normalized = path.startsWith("/") ? path : `/${path}`;

  // Priority 1: Try to get host from request headers (works in server components)
  // This ensures Vercel preview URLs are correctly resolved
  if (headersFn) {
    try {
      const headersList = await headersFn();
      const host = headersList.get("host");
      const protocol = headersList.get("x-forwarded-proto") || "https";

      if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
        const origin = `${protocol}://${host}`;
        try {
          return new URL(normalized, origin).toString();
        } catch {
          // Fall through to next priority
        }
      }
    } catch {
      // headers() may throw in some contexts (e.g., during build)
      // Fall through to next priority
    }
  }

  // Priority 2: Explicit internal hostname (bypasses public CDN/Cloudflare)
  const internalSiteUrl = process.env.INTERNAL_SITE_URL;
  if (internalSiteUrl) {
    try {
      return new URL(normalized, internalSiteUrl).toString();
    } catch (error) {
      console.warn(
        `[getInternalApiUrl] Invalid INTERNAL_SITE_URL "${internalSiteUrl}":`,
        error
      );
    }
  }

  // Priority 3: Vercel deployments (check before NEXT_PUBLIC_SITE_URL to ensure preview URLs work)
  // VERCEL_URL is provided at runtime and points to the exact deployment host.
  // It does not include the protocol.
  const vercelUrl =
    process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL || "";
  if (vercelUrl) {
    const origin = vercelUrl.startsWith("http")
      ? vercelUrl
      : `https://${vercelUrl}`;
    try {
      return new URL(normalized, origin).toString();
    } catch (error) {
      console.warn(
        `[getInternalApiUrl] Invalid VERCEL_URL "${vercelUrl}":`,
        error
      );
    }
  }

  // Priority 4: Explicit canonical hostname (used when internal/Vercel URLs aren't available)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    try {
      return new URL(normalized, process.env.NEXT_PUBLIC_SITE_URL).toString();
    } catch (error) {
      console.warn(
        `[getInternalApiUrl] Invalid NEXT_PUBLIC_SITE_URL "${process.env.NEXT_PUBLIC_SITE_URL}":`,
        error
      );
    }
  }

  // Priority 5: Fallback to runtime-computed siteUrl (ensures correct env vars are used)
  // Call getSiteUrl() at runtime instead of using module-level constant
  const siteUrl = getSiteUrl();
  return new URL(normalized, siteUrl).toString();
}

/**
 * Build URLSearchParams from FetchEventsParams.
 * Centralizes query string construction to eliminate duplication between
 * internal and external API calls.
 */
export function buildEventsQuery(params: FetchEventsParams): URLSearchParams {
  const query: Partial<FetchEventsParams> = {};
  query.page = typeof params.page === "number" ? params.page : 0;
  query.size = typeof params.size === "number" ? params.size : 10;

  if (params.place) query.place = params.place;
  if (params.category) query.category = params.category;
  if (params.lat !== undefined) query.lat = params.lat;
  if (params.lon !== undefined) query.lon = params.lon;
  if (params.radius !== undefined) query.radius = params.radius;
  if (params.term) query.term = params.term;
  if (params.byDate) query.byDate = params.byDate;
  if (params.from) query.from = params.from;
  if (params.to) query.to = params.to;

  return new URLSearchParams(
    Object.fromEntries(
      Object.entries(query)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    )
  );
}

/**
 * Build URLSearchParams from news fetch parameters.
 * Centralizes query string construction to eliminate duplication between
 * internal and external API calls.
 * @param params - News fetch parameters
 * @param setDefaults - If true, sets default values for page (0) and size (100). Default: true
 */
export function buildNewsQuery(
  params: FetchNewsParams,
  setDefaults = true
): URLSearchParams {
  const query: Partial<FetchNewsParams> = {};
  if (setDefaults) {
    query.page = typeof params.page === "number" ? params.page : 0;
    query.size = typeof params.size === "number" ? params.size : 100;
  } else {
    if (typeof params.page === "number") query.page = params.page;
    if (typeof params.size === "number") query.size = params.size;
  }
  if (params.place) query.place = params.place;

  return new URLSearchParams(
    Object.fromEntries(
      Object.entries(query)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)])
    )
  );
}

/**
 * Apply distance/radius filter to FetchEventsParams if coordinates are provided.
 * Centralizes the distance filter logic used across all event list pages.
 * @param params - The fetch params object to mutate
 * @param input - Location data (lat, lon, distance) - accepts numbers or strings for flexibility
 * @returns The same params object (for chaining if needed)
 */
export function applyDistanceToParams(
  params: FetchEventsParams,
  input: {
    lat?: number | string;
    lon?: number | string;
    distance?: number | string;
  }
): FetchEventsParams {
  // Parse lat/lon from string or number
  const lat =
    input.lat !== undefined
      ? typeof input.lat === "string"
        ? parseFloat(input.lat)
        : input.lat
      : undefined;
  const lon =
    input.lon !== undefined
      ? typeof input.lon === "string"
        ? parseFloat(input.lon)
        : input.lon
      : undefined;

  // Only apply if both coordinates are valid numbers
  if (lat !== undefined && lon !== undefined && !isNaN(lat) && !isNaN(lon)) {
    const maybeRadius = distanceToRadius(input.distance);
    if (maybeRadius !== undefined) {
      params.radius = maybeRadius;
    }
    params.lat = lat;
    params.lon = lon;
  }

  return params;
}

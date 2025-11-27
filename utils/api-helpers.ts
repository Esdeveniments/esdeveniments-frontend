/**
 * Shared API utilities for consistent origin resolution across middleware and layout
 * Follows the same fallback strategy as middleware.ts for edge runtime compatibility
 */

import { getSiteUrl } from "@config/index";
import type { FetchEventsParams } from "types/event";
import { distanceToRadius } from "types/event";
import type { FetchNewsParams } from "@lib/api/news";

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
    return "https://api.esdeveniments.cat"; // Production API
  }

  // Strategy 3: Default fallback (development/staging)
  return "https://api-pre.esdeveniments.cat";
}

/**
 * Build an absolute URL to the app's own API routes (App Router `/api/*`).
 * This is necessary when running without a request context (e.g., during build
 * or static generation), where relative URLs are invalid in Node's fetch.
 */
export function getInternalApiUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  // Prefer the current deployment's origin when available (Vercel previews/production)
  // VERCEL_URL is provided at runtime and points to the exact deployment host.
  // It does not include the protocol.
  const vercelUrl =
    process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL || "";
  if (vercelUrl) {
    const origin = vercelUrl.startsWith("http")
      ? vercelUrl
      : `https://${vercelUrl}`;
    return new URL(normalized, origin).toString();
  }
  // Fallback to runtime-computed siteUrl (ensures correct env vars are used)
  // Call getSiteUrl() at runtime instead of using module-level constant
  const siteUrl = getSiteUrl();
  return new URL(normalized, siteUrl).toString();
}

/**
 * Build URLSearchParams from FetchEventsParams.
 * Centralizes query string construction to eliminate duplication between
 * internal and external API calls.
 */
export function buildEventsQuery(
  params: FetchEventsParams
): URLSearchParams {
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

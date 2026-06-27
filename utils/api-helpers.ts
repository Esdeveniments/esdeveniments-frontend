/**
 * Shared API utilities for consistent origin resolution across middleware and layout
 * Follows the same fallback strategy as middleware.ts for edge runtime compatibility
 */

import { getSiteUrl } from "@config/index";
import apiDefaults from "@config/api-defaults.json";
import { isDevelopmentHost } from "@utils/host-validation";
import type { FetchEventsParams } from "types/event";
import { distanceToRadius } from "types/event";
import type { FetchNewsParams } from "@lib/api/news";
import type { HeadersFn } from "types/utils";
import type { InternalOriginOptions } from "types/api/internal";

/** Default API URL used as fallback when neither API_URL nor NEXT_PUBLIC_API_URL is set. */
const DEFAULT_API_URL = apiDefaults.apiUrl;

/** Default API origin (scheme + host) for proxy/middleware use. */
const DEFAULT_API_ORIGIN = new URL(DEFAULT_API_URL).origin;

/**
 * Resolve the external API base (e.g. "https://api.esdeveniments.cat/api"),
 * preferring the RUNTIME value.
 *
 * `API_URL` (non-public) is the source of truth: like any non-`NEXT_PUBLIC_` var
 * it is never inlined, so the value set in the container (Coolify) is read at
 * request time and always wins. `NEXT_PUBLIC_API_URL` is a build-time fallback
 * for older setups, but it is BAKED into the bundle — the indirect lookup does
 * NOT stop Turbopack inlining it (a wrong build value caused a silent events
 * outage on 2026-06-27), so it cannot be overridden at runtime. Prefer setting
 * `API_URL` in the container; the JSON default is the last resort.
 */
const _envKey = "NEXT_PUBLIC_API_URL";
export function getApiUrl(): string {
  return process.env.API_URL || process.env[_envKey] || DEFAULT_API_URL;
}

/**
 * Report whether the API base is explicitly configured — via the runtime
 * `API_URL` or the build-time `NEXT_PUBLIC_API_URL`. Callers use this to decide
 * between hitting the default production URL and taking a safe fallback path
 * (e.g., throw for mutations, return empty payload for read wrappers).
 */
export function isApiUrlConfigured(): boolean {
  return Boolean(process.env.API_URL || process.env[_envKey]);
}

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
  // Try the runtime API_URL first (non-public → never inlined), then the
  // build-time NEXT_PUBLIC_API_URL. Each candidate is parsed independently so an
  // invalid value falls through to the next rather than skipping straight to the
  // default — and the warning names which var was malformed.
  for (const name of ["API_URL", _envKey]) {
    const value = process.env[name];
    if (!value) continue;
    try {
      return new URL(value).origin;
    } catch {
      console.warn(`Invalid ${name} format:`, value);
    }
  }

  // Default fallback (single source of truth: config/api-defaults.json)
  return DEFAULT_API_ORIGIN;
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
 * Preview/staging deployments should provide INTERNAL_SITE_URL or VERCEL_URL.
 * Request Host is only trusted for exact localhost development hosts.
 */
export async function getInternalApiUrl(
  path: string,
  options: InternalOriginOptions = {},
): Promise<string> {
  const normalized = path.startsWith("/") ? path : `/${path}`;

  // Priority 1: Try to get host from request headers (works in server components)
  // This ensures Vercel preview URLs are correctly resolved.
  // Skipped when preferConfiguredOrigin is set: reading headers() makes the
  // caller dynamic, which under cacheComponents must be avoided in
  // generateMetadata (otherwise the metadata boundary lands in the resume tree
  // and mismatches the static shell). Metadata uses the configured origin below.
  if (headersFn && !options.preferConfiguredOrigin) {
    try {
      const headersList = await headersFn();
      const host = headersList.get("host");

      if (host) {
        if (isDevelopmentHost(host)) {
          const origin = `http://${host}`;
          try {
            return new URL(normalized, origin).toString();
          } catch {
            // Fall through to next priority
          }
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
        error,
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
        error,
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
        error,
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
  if (params.type) query.type = params.type;

  return new URLSearchParams(
    Object.fromEntries(
      Object.entries(query)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ),
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
  setDefaults = true,
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
        .map(([k, v]) => [k, String(v)]),
    ),
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
  },
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

import { fetchWithHmac } from "./fetch-wrapper";
import { getApiUrl } from "@utils/api-helpers";
import type { DetailFetchOptions } from "types/api/internal";

// Status for a backend request that never got a response: 504 when it was
// aborted or timed out, 502 otherwise.
export function transportFailureStatus(error: unknown): number {
  const name =
    error instanceof Error || error instanceof DOMException ? error.name : "";
  return name === "AbortError" || name === "TimeoutError" ? 504 : 502;
}

// A valid detail slug only uses URL-safe slug characters (letters, digits,
// hyphens, underscores, dots). Restricting 400 -> null to malformed slugs
// guarantees a gateway/backend 400 on a real slug is never cached as notFound()
// or used to prune a user's favorite.
const VALID_DETAIL_SLUG_PATTERN = /^[a-zA-Z0-9._-]+$/;

export function isValidDetailSlug(slug: string): boolean {
  return VALID_DETAIL_SLUG_PATTERN.test(slug);
}

/**
 * Fetch a single backend resource by slug.
 *
 * Returns `null` ONLY on a backend 404 or a 400 for a syntactically malformed
 * slug (e.g. bot garbage like `<a href=`). Anything else (timeout, 400 on a
 * valid slug, 401/403/429, 5xx, 3xx, invalid payload) throws an error carrying
 * its HTTP status (`getErrorStatus`) so cached readers and `"use cache"`
 * metadata never cache an outage as a "not found" 404.
 */
export async function fetchBackendDetailBySlug<T>(
  pathPrefix: string,
  slug: string,
  parse: (json: unknown) => T | null,
  label: string,
  { signal, skipConnection }: DetailFetchOptions = {},
): Promise<T | null> {
  const apiUrl = getApiUrl();
  let response: Response;
  try {
    // No `next: { revalidate }` - uses no-store to avoid cache explosion
    response = await fetchWithHmac(
      `${apiUrl}/${pathPrefix}/${encodeURIComponent(slug)}`,
      { signal, skipConnection },
    );
  } catch (error) {
    console.error(`${label} (external): request failed`, slug, error);
    throw Object.assign(
      new Error(`${label}: request failed for ${slug}`, {
        cause: error,
      }),
      { status: transportFailureStatus(error) },
    );
  }
  if (
    response.status === 404 ||
    (response.status === 400 && !VALID_DETAIL_SLUG_PATTERN.test(slug))
  ) {
    return null;
  }
  if (!response.ok) {
    console.error(`${label} (external):`, slug, "HTTP", response.status);
    // A 3xx arrives here (fetchWithHmac uses redirect: "manual"); report it
    // as a bad gateway so callers only ever see 4xx/5xx statuses.
    throw Object.assign(
      new Error(`${label}: HTTP ${response.status} for ${slug}`),
      { status: response.status >= 400 ? response.status : 502 },
    );
  }
  const parsed = parse(await response.json().catch(() => null));
  if (!parsed) {
    console.error(`${label} (external): invalid payload`, slug);
    throw Object.assign(
      new Error(`${label}: invalid payload for ${slug}`),
      { status: 502 },
    );
  }
  return parsed;
}

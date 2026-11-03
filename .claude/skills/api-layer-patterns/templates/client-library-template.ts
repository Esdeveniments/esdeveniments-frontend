/**
 * Client library template: lib/api/RESOURCE.ts (detail-by-slug reader only)
 *
 * Replace RESOURCE / Resource with your names. Mirrors fetchCategoryById in
 * lib/api/categories.ts; for a list reader copy fetchCategories there.
 * Server Components and other server code import from here, never from
 * *-external.ts. Client components fetch the relative /api/RESOURCE route
 * instead (SWR, e.g. components/hooks/useEvents.ts).
 * Not type-checked by the project (.github is outside tsc).
 *
 * isBuildPhase is true during `next build` AND at runtime on Coolify
 * (NODE_ENV=production, no VERCEL_URL), so the external branch is a real
 * production path, not just a build fallback.
 */
import { cache as reactCache } from "react";
import type { ResourceDetailResponseDTO } from "types/api/RESOURCE";
import { createKeyedCache } from "lib/api/cache";
import {
  getInternalApiUrl,
  getVercelProtectionBypassHeaders,
} from "@utils/api-helpers";
import { isBuildPhase } from "@utils/constants";
// Add these next to placesTag/placeTag in lib/cache/tags.ts.
import { resourcesTag, resourceTag } from "@lib/cache/tags";
import { parseResourceDetail } from "lib/validation/RESOURCE";
import { fetchResourceBySlugExternalResult } from "./RESOURCE-external";

// 24 h in-memory TTL: only for low-cardinality data (one entry per slug here).
const { cache: resourceBySlugCache, clear: clearResourceBySlugCache } =
  createKeyedCache<ResourceDetailResponseDTO | null>(86400000);

// Not called automatically. To clear it on revalidation, add the tag to
// CacheTag/RevalidatableTag (types/cache.ts), then to ALLOWED_TAGS and
// TAG_TO_CLEAR_FN in app/api/revalidate/route.ts.
export function clearResourceCaches(): void {
  clearResourceBySlugCache();
}

async function fetchResourceBySlugApi(
  slug: string | number,
): Promise<ResourceDetailResponseDTO | null> {
  const url = await getInternalApiUrl(
    `/api/RESOURCE/${encodeURIComponent(String(slug))}`,
  );
  // Plain fetch to our own internal route. `next` is fine here; it is never
  // allowed on fetchWithHmac in a *-external.ts wrapper.
  const response = await fetch(url, {
    headers: getVercelProtectionBypassHeaders(),
    next: {
      revalidate: 86400,
      tags: [resourcesTag, resourceTag(String(slug))],
    },
  });
  // The detail route answers 404 only when the backend did, so caching null
  // is safe. Any other error throws, and createKeyedCache stores nothing.
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return parseResourceDetail(await response.json());
}

export async function fetchResourceBySlug(
  slug: string,
): Promise<ResourceDetailResponseDTO | null> {
  // Internal routes don't exist during the build: call the wrapper directly.
  if (isBuildPhase) {
    const { data } = await fetchResourceBySlugExternalResult(slug);
    return data;
  }
  try {
    return await resourceBySlugCache(slug, fetchResourceBySlugApi);
  } catch (e) {
    console.error("Error fetching RESOURCE by slug:", e);
    return null;
  }
}

// Per-request dedupe for generateMetadata + page.
export const getResourceBySlug = reactCache(fetchResourceBySlug);

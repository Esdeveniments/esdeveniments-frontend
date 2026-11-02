/**
 * Client library template: lib/api/RESOURCE.ts
 *
 * Replace RESOURCE / Resource with your names. Mirrors lib/api/categories.ts.
 * Pages and components import from here, never from *-external.ts.
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
import { parseResourceDetail } from "lib/validation/RESOURCE";
import { fetchResourceBySlugExternal } from "./RESOURCE-external";

// 24 h in-memory TTL: only for low-cardinality data (one entry per slug here).
const { cache: resourceBySlugCache, clear: clearResourceBySlugCache } =
  createKeyedCache<ResourceDetailResponseDTO | null>(86400000);

// Called by app/api/revalidate/route.ts.
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
  // allowed on fetchWithHmac.
  const response = await fetch(url, {
    headers: getVercelProtectionBypassHeaders(),
    next: { revalidate: 86400, tags: ["RESOURCE", `RESOURCE:${slug}`] },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return parseResourceDetail(await response.json());
}

export async function fetchResourceBySlug(
  slug: string,
): Promise<ResourceDetailResponseDTO | null> {
  // Internal routes don't exist during the build: call the wrapper directly.
  if (isBuildPhase) {
    try {
      return await fetchResourceBySlugExternal(slug);
    } catch (error) {
      console.error("fetchResourceBySlug: external fetch failed", error);
      return null;
    }
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

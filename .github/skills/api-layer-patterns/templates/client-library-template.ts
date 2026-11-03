/**
 * Client library template: lib/api/RESOURCE.ts (detail-by-slug reader only)
 *
 * Replace RESOURCE / Resource with your names. Mirrors fetchPlaceBySlug in
 * lib/api/places.ts; for a list reader copy fetchCategories in
 * lib/api/categories.ts. Server Components and other server code import from
 * here, never from *-external.ts. Client components fetch the relative
 * /api/RESOURCE route instead (SWR, e.g. components/hooks/useEvents.ts).
 * Not type-checked by the project (.github is outside tsc).
 *
 * Server readers call the external wrapper directly: our /api/* routes do not
 * exist during `next build`.
 */
import { cache as reactCache } from "react";
import { connection } from "next/server";
import type { ResourceDetailResponseDTO } from "types/api/RESOURCE";
import { createKeyedCache } from "lib/api/cache";
import { fetchResourceBySlugExternalResult } from "./RESOURCE-external";

// 24 h in-memory TTL: only for low-cardinality data (one entry per slug here).
// null means a real 404 and is cached; errors throw and are not. maxEntries
// bounds the cached 404s for made-up slugs. A list reader whose wrapper falls
// back to [] uses createCache(ttl, { storeEmpty: false }) instead.
const { cache: resourceBySlugCache, clear: clearResourceBySlugCache } =
  createKeyedCache<ResourceDetailResponseDTO | null>(86400000, {
    maxEntries: 5000,
  });

// Not called automatically. To clear it on revalidation, add the tag to
// CacheTag/RevalidatableTag (types/cache.ts), then to ALLOWED_TAGS and
// TAG_TO_CLEAR_FN in app/api/revalidate/route.ts.
export function clearResourceCaches(): void {
  clearResourceBySlugCache();
}

async function fetchResourceBySlugOrThrow(
  slug: string | number,
): Promise<ResourceDetailResponseDTO | null> {
  const { data, error, status } = await fetchResourceBySlugExternalResult(
    String(slug),
  );
  if (status === 404) return null;
  if (!data) throw error ?? new Error(`RESOURCE ${slug}: no data`);
  return data;
}

export async function fetchResourceBySlug(
  slug: string,
): Promise<ResourceDetailResponseDTO | null> {
  // A cache hit skips fetchWithHmac's connection(); call it here so a warm
  // cache cannot change what Next prerenders.
  await connection();
  return resourceBySlugCache(slug, fetchResourceBySlugOrThrow);
}

// Per-request dedupe for generateMetadata + page.
export const getResourceBySlug = reactCache(fetchResourceBySlug);

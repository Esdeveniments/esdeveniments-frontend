import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { handleApiError } from "@utils/api-error-handler";
import type { RevalidatableTag } from "types/cache";
import type {
  CloudflarePurgeResult,
  RevalidateResponseDTO,
} from "types/api/revalidate";
import { clearPlacesCaches } from "@lib/api/places";
import { clearRegionsCaches } from "@lib/api/regions";
import { clearCategoriesCaches } from "@lib/api/categories";
import { clearCitiesCaches } from "@lib/api/cities";
import {
  getAllHtmlCdnTag,
  purgeCloudflareCache,
} from "@lib/cdn/cloudflare-purge";

/**
 * Whitelist of cache tags that can be revalidated via this endpoint.
 * Only includes tags related to places/regions data (infrequently changing).
 * Does NOT include events/news tags to prevent abuse.
 */
const ALLOWED_TAGS = [
  "places",
  "regions",
  "regions:options",
  "cities",
  "categories",
] as const satisfies readonly RevalidatableTag[];

/**
 * Tags that purge all HTML from Cloudflare.
 * These are structural data (places, regions, cities, categories) that affect
 * navigation, filters and place pages across ALL locales. A prefix purge can't
 * target the default locale (no prefix with next-intl's "as-needed"), so we
 * purge the `<host>:html` Cache-Tag that the proxy (utils/proxy-page-headers.ts) puts on every public page.
 * These revalidations are rare (only when new towns/places are added).
 */
const HTML_PURGE_TAGS: ReadonlySet<RevalidatableTag> = new Set([
  "places",
  "regions",
  "cities",
  "categories",
]);

/**
 * Tags with targeted Cloudflare prefix purges (API-only, no HTML pages).
 * Cloudflare doesn't cache `/api/*` today (cf-cache-status: DYNAMIC, no Cache
 * Rule), so this only matters if a rule starts caching API responses.
 */
const TAG_TO_CLOUDFLARE_PREFIXES: Partial<Record<RevalidatableTag, string[]>> = {
  "regions:options": ["www.esdeveniments.cat/api/regions/options"],
};

/**
 * Maps cache tags to in-memory cache clear functions.
 * Used to clear process-level caches during revalidation.
 */
const TAG_TO_CLEAR_FN: Record<RevalidatableTag, () => void> = {
  places: clearPlacesCaches,
  regions: clearRegionsCaches,
  "regions:options": clearRegionsCaches,
  cities: clearCitiesCaches,
  categories: clearCategoriesCaches,
};

/**
 * Validate the revalidation secret from request header.
 * Uses timing-safe comparison to prevent timing attacks.
 */
function isValidSecret(providedSecret: string | null): boolean {
  const expectedSecret = process.env.REVALIDATE_SECRET;

  if (!expectedSecret || !providedSecret) {
    return false;
  }

  try {
    return timingSafeEqual(
      Buffer.from(providedSecret),
      Buffer.from(expectedSecret)
    );
  } catch {
    // timingSafeEqual throws if lengths differ
    return false;
  }
}

/**
 * Validate that all provided tags are in the allowed whitelist.
 */
function validateTags(tags: unknown): tags is RevalidatableTag[] {
  if (!Array.isArray(tags) || tags.length === 0) {
    return false;
  }
  return tags.every(
    (tag): tag is RevalidatableTag =>
      typeof tag === "string" &&
      (ALLOWED_TAGS as readonly string[]).includes(tag)
  );
}

/**
 * Purge every public HTML page of this deployment by its `<host>:html`
 * Cache-Tag (set by utils/proxy-page-headers.ts). Purging everything also drops cached images and
 * other hosts in the zone, so it's only the fallback when the tag purge fails.
 */
async function purgeAllHtml(): Promise<CloudflarePurgeResult> {
  const htmlTag = getAllHtmlCdnTag();
  if (htmlTag) {
    const result = await purgeCloudflareCache({ tags: [htmlTag] });
    if (result.success) {
      return { purged: !result.skipped, tags: [htmlTag], skipped: result.skipped };
    }
    console.warn(`[revalidate] Tag purge failed (${result.error}), purging everything`);
  }
  const fallback = await purgeCloudflareCache({ purgeEverything: true });
  return {
    purged: fallback.success && !fallback.skipped,
    prefixes: ["*"],
    skipped: fallback.skipped,
    error: fallback.error,
  };
}

/**
 * POST /api/revalidate
 *
 * Secure endpoint to trigger Next.js cache revalidation for specific tags.
 * Also purges Cloudflare CDN caches if configured.
 * Used when new towns/places are added to the backend.
 *
 * Headers:
 *   x-revalidate-secret: The revalidation secret (required)
 *
 * Body:
 *   { "tags": ["places", "regions"] }
 *
 * Response:
 *   200: { "revalidated": true, "tags": [...], "cloudflare": {...} }
 *   400: { "error": "..." } - Invalid request
 *   401: { "error": "Unauthorized" } - Invalid/missing secret
 *   500: { "error": "..." } - Server error
 */
export async function POST(request: Request) {
  try {
    // 1. Validate authentication
    const secret = request.headers.get("x-revalidate-secret");

    if (!isValidSecret(secret)) {
      const rawSampleRate = process.env.REVALIDATE_UNAUTHORIZED_LOG_SAMPLE_RATE;
      const parsedSampleRate = rawSampleRate ? Number(rawSampleRate) : 0.01;
      const sampleRate = Number.isFinite(parsedSampleRate)
        ? Math.min(1, Math.max(0, parsedSampleRate))
        : 0.01;

      if (sampleRate > 0 && Math.random() < sampleRate) {
        const url = new URL(request.url);
        const userAgent = request.headers.get("user-agent") ?? "unknown";
        const cfConnectingIp = request.headers.get("cf-connecting-ip");
        const forwardedFor = request.headers.get("x-forwarded-for");
        const clientIp =
          cfConnectingIp ?? forwardedFor?.split(",")[0]?.trim() ?? "unknown";

        console.warn("Unauthorized revalidate attempt", {
          path: url.pathname,
          hasSecret: Boolean(secret),
          clientIp,
          userAgent,
        });
      }

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse and validate request body
    let body: { tags?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { tags } = body;

    // 3. Validate tags
    if (!validateTags(tags)) {
      const allowedList = ALLOWED_TAGS.join(", ");
      return NextResponse.json(
        {
          error: `Invalid or missing tags. Allowed tags: ${allowedList}`,
        },
        { status: 400 }
      );
    }

    // 4. Revalidate each tag (Next.js data cache)
    // Use { expire: 0 } for immediate invalidation (not stale-while-revalidate)
    // to prevent Cloudflare from repopulating with stale content after purge
    const revalidatedTags: RevalidatableTag[] = [];
    const failedTags: RevalidatableTag[] = [];
    for (const tag of tags) {
      try {
        revalidateTag(tag, { expire: 0 });
        revalidatedTags.push(tag);
      } catch (error) {
        console.warn(`revalidateTag failed for "${tag}":`, error);
        failedTags.push(tag);
      }
    }

    // 4b. Clear in-memory process caches based on tags
    // This ensures the running server gets fresh data
    const clearedFns = new Set<() => void>();
    for (const tag of tags) {
      const clearFn = TAG_TO_CLEAR_FN[tag];
      if (clearFn && !clearedFns.has(clearFn)) {
        clearFn();
        clearedFns.add(clearFn);
      }
    }

    // 5. Purge Cloudflare cache
    // Structural tags (places, regions, etc.) purge all HTML since they affect
    // every locale and page. Other tags use a targeted prefix purge.
    const needsHtmlPurge = revalidatedTags.some((tag) => HTML_PURGE_TAGS.has(tag));
    const cfPrefixes = new Set(
      revalidatedTags.flatMap((tag) => TAG_TO_CLOUDFLARE_PREFIXES[tag] ?? [])
    );

    let cloudflareResult: CloudflarePurgeResult;
    if (needsHtmlPurge) {
      cloudflareResult = await purgeAllHtml();
    } else if (cfPrefixes.size > 0) {
      const prefixArray = Array.from(cfPrefixes);
      const cfResult = await purgeCloudflareCache({ prefixes: prefixArray });
      cloudflareResult = {
        purged: cfResult.success && !cfResult.skipped,
        prefixes: prefixArray,
        skipped: cfResult.skipped,
        error: cfResult.error,
      };
    } else {
      cloudflareResult = { purged: false, skipped: true };
    }

    // 7. Log successful revalidation
    console.log(
      `[revalidate] Tags: ${revalidatedTags.join(", ")}${
        failedTags.length > 0
          ? ` (tag cache errors: ${failedTags.join(", ")})`
          : ""
      } | Cloudflare: ${
        cloudflareResult.purged
          ? "purged"
          : cloudflareResult.skipped
          ? "skipped"
          : "failed"
      }`
    );

    // Collect warnings for transient/partial failures
    const warnings: string[] = [];
    if (failedTags.length > 0) {
      warnings.push(
        `revalidateTag failed for: ${failedTags.join(
          ", "
        )} (data cache NOT invalidated for these tags, in-memory cache was cleared)`
      );
    }
    const response: RevalidateResponseDTO = {
      revalidated: true,
      tags: revalidatedTags,
      cloudflare: cloudflareResult,
      timestamp: new Date().toISOString(),
      ...(warnings.length > 0 && { warning: warnings.join(" | ") }),
    };

    return NextResponse.json(response, { status: 200 });
  } catch (e) {
    return handleApiError(e, "/api/revalidate", {
      errorMessage: "Failed to revalidate cache",
    });
  }
}

/**
 * Explicitly reject other HTTP methods
 */
export async function GET() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Method not allowed. Use POST." },
    { status: 405 }
  );
}

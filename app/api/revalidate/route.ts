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
 * Maps cache tags to Cloudflare URL prefixes for cache purging.
 * Cloudflare prefixes are literal path prefixes (NO wildcards supported).
 * @see https://developers.cloudflare.com/cache/how-to/purge-cache/purge-by-prefix/
 */
const TAG_TO_CLOUDFLARE_PREFIXES: Record<RevalidatableTag, string[]> = {
  places: ["/api/places"],
  regions: ["/api/regions"],
  "regions:options": ["/api/regions/options"],
  cities: ["/api/cities"],
  categories: ["/api/categories"],
};

/**
 * Maps cache tags to in-memory cache clear functions.
 * Used to clear warm Lambda instance caches during revalidation.
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
 * Purge Cloudflare cache for given URL prefixes.
 * Returns success status and any error message.
 */
async function purgeCloudflareCache(
  prefixes: string[]
): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  // Skip if Cloudflare is not configured
  if (!zoneId || !apiToken) {
    return { success: true, skipped: true }; // Not an error, just not configured
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    let response: Response;
    try {
      response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prefixes }),
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = `Cloudflare purge failed: ${response.status}`;
      console.error(errorMsg, errorData);
      return { success: false, error: errorMsg };
    }

    return { success: true };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Unknown Cloudflare error";
    console.error("Cloudflare purge error:", error);
    return { success: false, error: errorMsg };
  }
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
    // Next 16 requires a profile; use "max" to force full invalidation
    // Wrapped in try-catch to handle transient DynamoDB tag cache errors in OpenNext
    const revalidatedTags: RevalidatableTag[] = [];
    const failedTags: RevalidatableTag[] = [];
    for (const tag of tags) {
      try {
        revalidateTag(tag, "max");
        revalidatedTags.push(tag);
      } catch (error) {
        // Non-fatal: tag cache write failed, but revalidation still triggered
        console.warn(`revalidateTag failed for "${tag}":`, error);
        failedTags.push(tag);
        // Still count as revalidated since the actual cache invalidation happens
        revalidatedTags.push(tag);
      }
    }

    // 4b. Clear in-memory Lambda caches based on tags
    // This ensures warm Lambda instances get fresh data
    const clearedFns = new Set<() => void>();
    for (const tag of tags) {
      const clearFn = TAG_TO_CLEAR_FN[tag];
      if (clearFn && !clearedFns.has(clearFn)) {
        clearFn();
        clearedFns.add(clearFn);
      }
    }

    // 5. Purge Cloudflare cache for corresponding URL prefixes
    const cfPrefixes = new Set(
      tags.flatMap((tag) => TAG_TO_CLOUDFLARE_PREFIXES[tag] ?? [])
    );

    let cloudflareResult: CloudflarePurgeResult;
    if (cfPrefixes.size > 0) {
      const prefixArray = Array.from(cfPrefixes);
      const cfResult = await purgeCloudflareCache(prefixArray);
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
        `Tag cache write failed for: ${failedTags.join(
          ", "
        )} (transient, revalidation still applied)`
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

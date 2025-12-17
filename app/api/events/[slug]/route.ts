import { NextResponse } from "next/server";
import { fetchEventBySlug as fetchExternalEvent } from "@lib/api/events-external";
import { revalidateTag } from "next/cache";
import { eventsTag, eventsCategorizedTag } from "@lib/cache/tags";
import { handleApiError } from "@utils/api-error-handler";
import { createKeyedCache } from "@lib/api/cache";
import type { EventDetailResponseDTO } from "types/api/event";

export const runtime = "nodejs";

// Cache event detail by slug to avoid hitting backend on every refresh (which increments visits).
// TTL aligns with Cache-Control s-maxage for consistency.
const EVENT_DETAIL_TTL_MS = 30 * 60 * 1000; // 30 minutes
const { cache: eventDetailCache } =
  createKeyedCache<EventDetailResponseDTO | null>(EVENT_DETAIL_TTL_MS);

// GET /api/events/[slug] - server-only proxy with server-side HMAC and stable caching
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const data = await eventDetailCache(slug, async (key) => {
      return await fetchExternalEvent(String(key));
    });
    // If event is past, mark cache tags as stale for background revalidation
    // revalidateTag with "max" is idempotent, so multiple calls are safe
    if (data?.endDate && new Date(data.endDate).getTime() < Date.now()) {
      revalidateTag(eventsTag, "max");
      revalidateTag(eventsCategorizedTag, "max");
    }
    return NextResponse.json(data ?? null, {
      status: data ? 200 : 404,
      headers: {
        // Shared cache at the edge; app fetch can also set revalidate tags
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=1800",
      },
    });
  } catch (e) {
    return handleApiError(e, "/api/events/[slug]", {
      fallbackData: null,
    });
  }
}

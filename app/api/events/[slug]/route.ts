import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { fetchEventBySlug as fetchExternalEvent } from "@lib/api/events-external";
import { deleteEventById } from "@lib/api/events";
import { handleApiError } from "@utils/api-error-handler";
import { createKeyedCache } from "@lib/api/cache";
import type { EventDetailResponseDTO } from "types/api/event";

// Cache event detail by slug to avoid hitting backend on every refresh (which increments visits).
// TTL aligns with Cache-Control s-maxage for consistency.
const EVENT_DETAIL_TTL_MS = 30 * 60 * 1000; // 30 minutes
const { cache: eventDetailCache, delete: deleteEventDetailCache } =
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
    return NextResponse.json(data ?? null, {
      status: data ? 200 : 404,
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=1800",
      },
    });
  } catch (e) {
    return handleApiError(e, "/api/events/[slug]", {
      fallbackData: null,
    });
  }
}

// DELETE /api/events/[slug] - delete event by id (requires auth cookie)
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug: id } = await context.params;
    await deleteEventById(id);
    // Clear in-memory cache so next GET doesn't serve stale data
    deleteEventDetailCache(id);
    // Purge Next.js Data Cache for all locales of the event detail page.
    // The id doubles as slug in our URL scheme — best-effort, won't throw.
    try {
      revalidatePath(`/e/${id}`);
      revalidatePath(`/es/e/${id}`);
      revalidatePath(`/en/e/${id}`);
    } catch {
      // revalidatePath is a no-op outside of a render context in some environments
    }
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return handleApiError(e, "/api/events/[slug] DELETE");
  }
}

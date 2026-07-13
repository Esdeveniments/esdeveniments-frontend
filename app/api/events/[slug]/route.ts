import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { fetchEventBySlug as fetchExternalEvent } from "@lib/api/events-external";
import { deleteEventById } from "@lib/api/events";
import { getCurrentUser } from "@lib/auth/session";
import { handleApiError } from "@utils/api-error-handler";
import { createKeyedCache } from "@lib/api/cache";
import { eventTag } from "@lib/cache/tags";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "types/i18n";
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

// DELETE /api/events/[slug] - delete event by slug (requires auth cookie).
// The backend enforces the creator check; we fail fast if no session exists.
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await context.params;
    const event = await fetchExternalEvent(slug);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Fail fast if the session does not belong to the event creator. The
    // backend also enforces this, but checking here avoids issuing a mutation
    // for events the caller does not own.
    const isCreator =
      Boolean(currentUser.id) &&
      currentUser.id === event.createdByUser?.id;
    if (!isCreator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteEventById(event.id);
    // Clear in-memory cache so next GET doesn't serve stale data
    deleteEventDetailCache(slug);
    // Purge Next.js fetch Data Cache (tagged by lib/api/events.ts)
    revalidateTag(eventTag(slug), { expire: 0 });
    // Purge Next.js Data Cache for all locales of the event detail page.
    // Default locale (ca) has no prefix; non-default locales get a prefix path.
    try {
      for (const locale of SUPPORTED_LOCALES) {
        const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
        revalidatePath(`${prefix}/e/${slug}`);
      }
    } catch {
      // revalidatePath is a no-op outside of a render context in some environments
    }
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return handleApiError(e, "/api/events/[slug] DELETE");
  }
}

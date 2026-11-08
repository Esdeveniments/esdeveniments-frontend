import { NextResponse, after } from "next/server";
import { revalidateTag } from "next/cache";
import { purgeEventPagesFromCdn } from "@lib/cdn/cloudflare-purge";
import { submitEventsToIndexNow } from "@lib/seo/indexnow";
import { fetchEventBySlug as fetchExternalEvent } from "@lib/api/events-external";
import { deleteEventById } from "@lib/api/events";
import { getCurrentUser } from "@lib/auth/session";
import { handleApiError } from "@utils/api-error-handler";
import { isEventOwner } from "@utils/event-helpers";
import { eventDetailCache, deleteEventDetailCache } from "@lib/cache/event-detail-cache";
import { revalidateEventPages } from "@lib/cache/revalidate-event-pages";
import { eventTag, eventsTag, eventsCategorizedTag } from "@lib/cache/tags";

// GET /api/events/[slug] - server-only proxy with server-side HMAC and stable caching
export async function GET(
  _request: Request,
  context: RouteContext<"/api/events/[slug]">
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
  context: RouteContext<"/api/events/[slug]">
) {
  try {
    const [currentUser, { slug }] = await Promise.all([
      getCurrentUser(),
      context.params,
    ]);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const event = await fetchExternalEvent(slug);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Fail fast if the session does not belong to the event creator. The
    // backend also enforces this, but checking here avoids issuing a mutation
    // for events the caller does not own.
    if (!isEventOwner(currentUser.id, event.owner?.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteEventById(event.id);
    // Clear in-memory cache so next GET doesn't serve stale data
    deleteEventDetailCache(slug);
    // Purge Next.js fetch Data Cache for the specific event and all event
    // lists so deleted events don't remain in cached listing pages.
    revalidateTag(eventTag(slug), { expire: 0 });
    revalidateTag(eventsTag, { expire: 0 });
    revalidateTag(eventsCategorizedTag, { expire: 0 });
    revalidateEventPages([slug]);
    // Next's tags don't reach Cloudflare: purge the pages that showed the
    // event. Next starts the revalidations above before the response is sent,
    // and after() runs once it has been sent.
    after(async () => {
      await purgeEventPagesFromCdn([event]);
      await submitEventsToIndexNow([slug]);
    });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return handleApiError(e, "/api/events/[slug] DELETE");
  }
}

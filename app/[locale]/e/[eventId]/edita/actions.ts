"use server";
import { updateTag, refresh } from "next/cache";
import { after } from "next/server";
import {
  updateEventById,
  fetchEventBySlug,
  replaceEventImage,
  deleteEventImage,
} from "@lib/api/events";
import type { EventBaseRequestDTO, EventUpdateRequestDTO } from "types/api/event";
import type { EditEventResult } from "types/event";
import { eventsTag, eventTag } from "@lib/cache/tags";
import { deleteEventDetailCache } from "@lib/cache/event-detail-cache";
import { revalidateEventPages } from "@lib/cache/revalidate-event-pages";
import { purgeEventPagesFromCdn } from "@lib/cdn/cloudflare-purge";
import { submitEventsToIndexNow } from "@lib/seo/indexnow";
import { hubPathsFor } from "@utils/festivity";
import { getCurrentUser } from "@lib/auth/session";
import { isEventOwner } from "@utils/event-helpers";
import { getValidatedImageFile } from "@utils/image-validation";

/**
 * `cover` (optional) changes the event image: `imageFile` replaces it,
 * `removeImage` deletes it. Absent = keep the current image.
 */
export async function editEvent(
  eventId: string,
  slug: string,
  data: EventBaseRequestDTO,
  cover?: FormData
): Promise<EditEventResult> {
  // 1. Resolve the event by slug and verify the caller-provided id matches.
  // This prevents a mismatch where a malicious client passes a slug they own
  // alongside an different eventId.
  const [currentUser, event] = await Promise.all([
    getCurrentUser(),
    fetchEventBySlug(slug),
  ]);

  if (!event) {
    return { success: false, error: "Event not found" };
  }

  if (event.id !== eventId || !isEventOwner(currentUser?.id, event.owner?.id)) {
    return {
      success: false,
      error: "Unauthorized: only the event creator can edit this event",
    };
  }

  // 2. Update the event in your backend using the resolved event id.
  // `indexed` is required by the backend's UpdateEventRequestDTO but not part
  // of the client-facing form data — add it server-side so the client can't
  // accidentally (or maliciously) set it to false.
  const updatePayload: EventUpdateRequestDTO = { ...data, indexed: true };
  const updatedEvent = await updateEventById(event.id, updatePayload);

  // The text edit is already saved, so a failed cover change must still
  // reach the cache invalidation below.
  let coverFailed = false;
  try {
    const image = await getValidatedImageFile(cover?.get("imageFile"));
    if (image) {
      await replaceEventImage(event.id, image);
    } else if (cover?.get("removeImage")) {
      await deleteEventImage(event.id);
    }
  } catch (error) {
    console.error("editEvent: cover update failed", error);
    coverFailed = true;
  }

  // 2. Immediately expire cache tags for event lists and the specific event
  // This ensures read-your-own-writes: the updated event appears immediately
  updateTag(eventsTag);
  // If slug changed, also expire the old event tag
  if (updatedEvent.slug !== slug) {
    updateTag(eventTag(slug));
    deleteEventDetailCache(slug);
  }
  updateTag(eventTag(updatedEvent.slug));
  // Clear the in-memory keyed cache so the internal API route does not serve
  // stale data on the next GET (the 30-min TTL would otherwise keep the
  // pre-edit event for up to 30 minutes, even after updateTag/refresh).
  deleteEventDetailCache(updatedEvent.slug);
  // Revalidate the HTML page on both the old and new slug (the title edit may
  // have changed it).
  revalidateEventPages([updatedEvent.slug, slug]);
  // Next's tags don't reach Cloudflare: purge the pages that showed the old
  // event and those that show the new one (place or slug may have changed).
  after(async () => {
    await purgeEventPagesFromCdn([event, updatedEvent]);
    await submitEventsToIndexNow(
      [slug, updatedEvent.slug],
      hubPathsFor([event, updatedEvent]),
    );
  });
  // Refresh the current request to reflect changes
  refresh();

  if (coverFailed) {
    return {
      success: false,
      newSlug: updatedEvent.slug,
      errorCode: "COVER_UPDATE_FAILED",
    };
  }

  // 3. Return result with new slug for client redirection
  return { success: true, newSlug: updatedEvent.slug };
}

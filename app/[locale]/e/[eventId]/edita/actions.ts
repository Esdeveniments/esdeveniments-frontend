"use server";
import { updateTag, refresh, revalidatePath } from "next/cache";
import { updateEventById, fetchEventBySlug } from "@lib/api/events";
import type { EventBaseRequestDTO, EventUpdateRequestDTO } from "types/api/event";
import type { EditEventResult } from "types/event";
import { eventsTag, eventTag } from "@lib/cache/tags";
import { deleteEventDetailCache } from "@lib/cache/event-detail-cache";
import { getCurrentUser } from "@lib/auth/session";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "types/i18n";

export async function editEvent(
  eventId: string,
  slug: string,
  data: EventBaseRequestDTO
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

  if (event.id !== eventId) {
    return {
      success: false,
      error: "Unauthorized: only the event creator can edit this event",
    };
  }

  // Require both IDs to be defined and match. A missing creator on a legacy
  // event must not match a logged-out user (undefined === undefined).
  const isCreator = Boolean(
    currentUser?.id &&
      event.createdByUser?.id &&
      currentUser.id === event.createdByUser.id,
  );
  if (!isCreator) {
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
  // Revalidate the HTML page for all locales so the user sees changes on
  // both the old and new slug (if the slug changed from the title update).
  try {
    for (const locale of SUPPORTED_LOCALES) {
      const prefix = locale === DEFAULT_LOCALE ? "" : `/${locale}`;
      revalidatePath(`${prefix}/e/${updatedEvent.slug}`);
      if (updatedEvent.slug !== slug) {
        revalidatePath(`${prefix}/e/${slug}`);
      }
    }
  } catch {
    // revalidatePath is a no-op outside of a render context in some environments
  }
  // Refresh the current request to reflect changes
  refresh();

  // 3. Return result with new slug for client redirection
  return { success: true, newSlug: updatedEvent.slug };
}

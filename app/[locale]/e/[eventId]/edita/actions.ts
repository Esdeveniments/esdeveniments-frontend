"use server";
import { updateTag, refresh } from "next/cache";
import { updateEventById, fetchEventBySlug } from "@lib/api/events";
import type { EventUpdateRequestDTO } from "types/api/event";
import type { EditEventResult } from "types/event";
import { eventsTag, eventTag } from "@lib/cache/tags";
import { getCurrentUser } from "@lib/auth/session";

export async function editEvent(
  eventId: string,
  slug: string,
  data: EventUpdateRequestDTO
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

  // 2. Update the event in your backend using the resolved event id
  const updatedEvent = await updateEventById(event.id, data);

  // 2. Immediately expire cache tags for event lists and the specific event
  // This ensures read-your-own-writes: the updated event appears immediately
  updateTag(eventsTag);
  // If slug changed, also expire the old event tag
  if (updatedEvent.slug !== slug) {
    updateTag(eventTag(slug));
  }
  updateTag(eventTag(updatedEvent.slug));
  // Refresh the current request to reflect changes
  refresh();

  // 3. Return result with new slug for client redirection
  return { success: true, newSlug: updatedEvent.slug };
}

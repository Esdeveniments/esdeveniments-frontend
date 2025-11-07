"use server";
import { updateTag, refresh } from "next/cache";
import { updateEventById } from "lib/api/events";
import type { EventUpdateRequestDTO } from "types/api/event";
import { eventsTag, eventTag } from "lib/cache/tags";

export async function editEvent(
  eventId: string,
  slug: string,
  data: EventUpdateRequestDTO
) {
  // 1. Update the event in your backend
  const updatedEvent = await updateEventById(eventId, data);

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

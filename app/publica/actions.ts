"use server";
import { updateTag, refresh } from "next/cache";
import { createEvent } from "lib/api/events";
import type { EventCreateRequestDTO } from "types/api/event";
import { eventsTag, eventsCategorizedTag } from "lib/cache/tags";

export async function createEventAction(
  data: EventCreateRequestDTO,
  imageFile?: File
) {
  // 1. Create the event in your backend
  const created = await createEvent(data, imageFile);

  // 2. Immediately expire cache tags for event lists and categorized collections
  // This ensures read-your-own-writes: the new event appears immediately
  updateTag(eventsTag);
  updateTag(eventsCategorizedTag);
  // Refresh the current request to reflect changes
  refresh();

  // 3. Return the created event or result for your client
  return { success: true, event: created };
}

"use server";
import { updateTag, refresh } from "next/cache";
import { createEvent, uploadEventImage } from "@lib/api/events";
import type { E2EEventExtras } from "types/api/event";
import type { EventCreateRequestDTO } from "types/api/event";
import { eventsTag, eventsCategorizedTag } from "@lib/cache/tags";

export async function createEventAction(
  data: EventCreateRequestDTO,
  imageFile?: File,
  e2eExtras?: E2EEventExtras
) {
  let imageUrl = data.imageUrl ?? null;

  if (imageFile) {
    imageUrl = await uploadEventImage(imageFile);
  }

  const payload: EventCreateRequestDTO = {
    ...data,
    imageUrl,
  };

  // 1. Create the event in your backend
  const created = await createEvent(payload, e2eExtras);

  // 2. Immediately expire cache tags for event lists and categorized collections
  // This ensures read-your-own-writes: the new event appears immediately
  updateTag(eventsTag);
  updateTag(eventsCategorizedTag);
  // Refresh the current request to reflect changes
  refresh();

  // 3. Return the created event or result for your client
  return { success: true, event: created };
}

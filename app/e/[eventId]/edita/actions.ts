"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { updateEventById } from "lib/api/events";
import type { EventUpdateRequestDTO } from "types/api/event";

export async function editEvent(
  eventId: string,
  slug: string,
  data: EventUpdateRequestDTO
) {
  // 1. Update the event in your backend
  const updatedEvent = await updateEventById(eventId, data);

  // 2. Revalidate the event detail page (purge ISR cache)
  // If slug changed, clear old path; always revalidate the new one
  if (updatedEvent.slug !== slug) {
    await revalidatePath(`/e/${slug}`);
  }
  await revalidatePath(`/e/${updatedEvent.slug}`);
  // Invalidate lists and the specific event cache tag
  revalidateTag("events");
  revalidateTag(`event:${updatedEvent.slug}`);

  // 3. Return result with new slug for client redirection
  return { success: true, newSlug: updatedEvent.slug };
}

"use server";
import { revalidatePath } from "next/cache";
import { updateEventById } from "lib/api/events";
import type { EventUpdateRequestDTO } from "types/api/event";

export async function editEvent(
  eventId: string,
  slug: string,
  data: EventUpdateRequestDTO
) {
  // 1. Update the event in your backend
  await updateEventById(eventId, data);

  // 2. Revalidate the event detail page (purge ISR cache)
  await revalidatePath(`/e/${slug}`);

  // 3. Optionally, return a result for your client
  return { success: true };
}

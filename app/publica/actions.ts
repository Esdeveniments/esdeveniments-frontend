"use server";
import { revalidatePath } from "next/cache";
import { createEvent } from "lib/api/events";
import type { EventCreateRequestDTO } from "types/api/event";

export async function createEventAction(
  data: EventCreateRequestDTO,
  imageFile?: File
) {
  // 1. Create the event in your backend
  const created = await createEvent(data, imageFile);

  // 2. Revalidate the event list page (purge ISR cache)
  await revalidatePath("/e");

  // 3. Optionally, return the created event or result for your client
  return { success: true, event: created };
}

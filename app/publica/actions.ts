"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createEvent } from "lib/api/events";
import type { EventCreateRequestDTO } from "types/api/event";

export async function createEventAction(
  data: EventCreateRequestDTO,
  imageFile?: File
) {
  // E2E test mode: avoid external API calls and return a predictable result
  if (process.env.E2E_TEST_MODE === "true") {
    await revalidatePath("/e");
    return { success: true, event: { slug: "e2e-test-event" } as any };
  }

  // 1. Create the event in your backend
  const created = await createEvent(data, imageFile);

  // 2. Revalidate the event list page (purge ISR cache)
  await revalidatePath("/e");
  // Also invalidate cached event lists and categorized collections
  revalidateTag("events");
  revalidateTag("events:categorized");

  // 3. Optionally, return the created event or result for your client
  return { success: true, event: created };
}

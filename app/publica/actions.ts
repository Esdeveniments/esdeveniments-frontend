"use server";
import { updateTag, refresh } from "next/cache";
import { after } from "next/server";
import { createEvent } from "@lib/api/events";
import type { E2EEventExtras } from "types/api/event";
import type { EventCreateRequestDTO } from "types/api/event";
import { eventsTag, eventsCategorizedTag } from "@lib/cache/tags";
import { fireAndForgetFetch } from "@utils/safe-fetch";
import { env } from "@utils/misc-helpers";

/**
 * Sends email notification via Pipedream when a new event is published.
 * Only runs in production environment with configured webhook URL.
 * Failures are logged but don't block event creation.
 */
async function sendNewEventEmail(title: string, slug: string): Promise<void> {
  const webhookUrl = process.env.NEW_EVENT_EMAIL_URL;
  const isProduction = env === "prod";

  if (!webhookUrl || !isProduction) {
    return;
  }

  await fireAndForgetFetch(webhookUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, slug }),
    context: {
      tags: { section: "publica", action: "send-email" },
      extra: { title, slug },
    },
  });
}

export async function createEventAction(
  data: EventCreateRequestDTO,
  e2eExtras?: E2EEventExtras
) {
  // 1. Create the event in your backend
  const created = await createEvent(data, e2eExtras);

  // 2. Send email notification (fire-and-forget, non-blocking)
  // Uses `after` to ensure execution completes in serverless environments
  if (created?.slug && created?.title) {
    const { title, slug } = created;
    after(() => sendNewEventEmail(title, slug));
  }

  // 3. Immediately expire cache tags for event lists and categorized collections
  // This ensures read-your-own-writes: the new event appears immediately
  updateTag(eventsTag);
  updateTag(eventsCategorizedTag);
  // Refresh the current request to reflect changes
  refresh();

  // 4. Return the created event or result for your client
  return { success: true, event: created };
}

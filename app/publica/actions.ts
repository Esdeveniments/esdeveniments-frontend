"use server";
import { updateTag, refresh } from "next/cache";
import { captureException } from "@sentry/nextjs";
import { createEvent } from "@lib/api/events";
import type { E2EEventExtras } from "types/api/event";
import type { EventCreateRequestDTO } from "types/api/event";
import { eventsTag, eventsCategorizedTag } from "@lib/cache/tags";

/**
 * Sends email notification via Pipedream when a new event is published.
 * Only runs in production environment with configured webhook URL.
 * Failures are logged but don't block event creation.
 */
async function sendNewEventEmail(title: string, slug: string): Promise<void> {
  const webhookUrl = process.env.NEXT_PUBLIC_NEW_EVENT_EMAIL_URL;
  const isProduction = process.env.NEXT_PUBLIC_VERCEL_ENV === "production";

  if (!webhookUrl || !isProduction) {
    return;
  }

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, slug }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error sending new event email: ${message}`);
    captureException(new Error(`Error sending new event email: ${message}`), {
      tags: { section: "publica", action: "send-email" },
      extra: { title, slug },
    });
  }
}

export async function createEventAction(
  data: EventCreateRequestDTO,
  e2eExtras?: E2EEventExtras
) {
  // 1. Create the event in your backend
  const created = await createEvent(data, e2eExtras);

  // 2. Send email notification (fire-and-forget, non-blocking)
  if (created?.slug && created?.title) {
    sendNewEventEmail(created.title, created.slug).catch(() => {
      // Silently ignore - error already logged in sendNewEventEmail
    });
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

"use server";
import { updateTag } from "next/cache";
import { after } from "next/server";
import { captureException } from "@sentry/nextjs";
import { createEvent } from "@lib/api/events";
import { getErrorStatus } from "@utils/error-status";
import type { E2EEventExtras } from "types/api/event";
import type { EventCreateRequestDTO } from "types/api/event";
import type { CreateEventActionResult } from "types/event";
import { eventsTag, eventsCategorizedTag, eventTag } from "@lib/cache/tags";
import { purgeEventPagesFromCdn } from "@lib/cdn/cloudflare-purge";
import { submitEventsToIndexNow } from "@lib/seo/indexnow";
import { hubPathsFor } from "@utils/festivity";
import { fireAndForgetFetch } from "@utils/safe-fetch";
import { isProductionDeploymentRequest } from "@lib/production-request";
import { getValidatedImageFile } from "@utils/image-validation";
import { matchCreateEventFailureReason } from "@utils/publica-analytics";

/**
 * Sends email notification via Pipedream when a new event is published.
 * Only runs in production environment with configured webhook URL.
 * Failures are logged but don't block event creation.
 */
async function sendNewEventEmail(title: string, slug: string): Promise<void> {
  const webhookUrl = process.env.NEW_EVENT_EMAIL_URL;

  if (!webhookUrl || !(await isProductionDeploymentRequest())) {
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

/**
 * `formData` carries `event` (EventCreateRequestDTO as a JSON string) and an
 * optional `imageFile`. FormData is the server-action-safe way to send a File.
 */
export async function createEventAction(
  formData: FormData,
  e2eExtras?: E2EEventExtras
): Promise<CreateEventActionResult> {
  const rawEvent = formData.get("event");
  if (typeof rawEvent !== "string") {
    throw new Error("createEventAction: missing event payload");
  }
  // The backend validates the fields; this only rejects a malformed payload.
  const data = JSON.parse(rawEvent) as EventCreateRequestDTO;
  let imageFile: File | null;
  try {
    imageFile = await getValidatedImageFile(formData.get("imageFile"));
  } catch {
    return { success: false, reason: "invalid-image" };
  }

  // Actionable client errors are *returned* as a CreateEventActionResult, not
  // re-thrown: Next.js redacts thrown Server Action error messages/properties
  // in production (only a generic message + digest reach the client), so
  // PublishForm could never tell duplicates, size limits, or validation errors
  // apart from a 5xx if we threw here. Anything unexpected (5xx / network)
  // still throws.
  let created;
  try {
    // 1. Create the event in your backend
    created = await createEvent(data, imageFile, e2eExtras);
  } catch (err) {
    const status = getErrorStatus(err);
    const message = err instanceof Error ? err.message : String(err);

    if (status === 401 || status === 403) {
      const nextAction =
        status === 401 ? "logout-and-relogin" : "complete-profile";
      console.error(
        `createEventAction: backend rejected with ${status} \u2014 ${status === 401 ? "Likely stale Bearer \u2014 user should log out and back in." : "Likely profileCompleted: false \u2014 user should complete profile onboarding."}`,
      );
      captureException(new Error(`createEvent rejected: ${status}`), {
        tags: {
          section: "publica-create",
          authStatus: String(status),
          nextAction,
        },
        extra: {
          dataFields: Object.keys(data ?? {}),
        },
      });
      return {
        success: false,
        reason: status === 401 ? "stale-session" : "profile-incomplete",
      };
    }

    const failureReason = matchCreateEventFailureReason(message, status);
    if (failureReason) {
      return { success: false, reason: failureReason };
    }

    throw err;
  }

  // 2. Send email notification (fire-and-forget, non-blocking)
  // Uses `after` to ensure execution completes in serverless environments
  if (created?.slug && created?.title) {
    const { title, slug } = created;
    after(() => sendNewEventEmail(title, slug));
  }

  // 3. Immediately expire cache tags for event lists, categorized collections,
  // and the newly created slug so the redirect destination renders fresh.
  updateTag(eventsTag);
  updateTag(eventsCategorizedTag);
  if (created?.slug) {
    updateTag(eventTag(created.slug));
  }
  // Next's tags don't reach Cloudflare: purge the listings that show the
  // event. after() runs once the action's revalidations are applied.
  after(async () => {
    await purgeEventPagesFromCdn([created]);
    await submitEventsToIndexNow(
      [created?.slug],
      hubPathsFor([created]),
    );
  });

  // 4. Return the created event or result for your client
  return { success: true, event: created };
}

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
import { getValidatedImageFile } from "@utils/image-validation";
import { matchCreateEventFailureReason } from "@utils/publica-analytics";
import {
  PUBLISH_ALERT_IMMEDIATE,
  PUBLISH_ALERT_TAG,
} from "@utils/sentry-helpers";

/**
 * `formData` carries `event` (EventCreateRequestDTO as a JSON string) and an
 * optional `imageFile`. FormData is the server-action-safe way to send a File.
 */
export async function createEventAction(
  formData: FormData,
  e2eExtras?: E2EEventExtras
): Promise<CreateEventActionResult> {
  const capturePublicaCreateError = (
    error: unknown,
    tags: Record<string, string>,
    extra?: Record<string, unknown>,
  ) =>
    captureException(error, {
      tags: {
        section: "publica-create",
        [PUBLISH_ALERT_TAG]: PUBLISH_ALERT_IMMEDIATE,
        ...tags,
      },
      ...(extra ? { extra } : {}),
    });

  const rawEvent = formData.get("event");
  if (typeof rawEvent !== "string") {
    const err = new Error("createEventAction: missing event payload");
    capturePublicaCreateError(err, { failureKind: "missing-payload" });
    throw err;
  }
  // The backend validates the fields; this only rejects a malformed payload.
  let data: EventCreateRequestDTO;
  try {
    data = JSON.parse(rawEvent) as EventCreateRequestDTO;
  } catch (err) {
    capturePublicaCreateError(err, { failureKind: "invalid-payload-json" });
    throw err;
  }
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
      capturePublicaCreateError(
        new Error(`createEvent rejected: ${status}`),
        { authStatus: String(status), nextAction },
        { dataFields: Object.keys(data ?? {}) },
      );
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

  // 2. Immediately expire cache tags for event lists, categorized collections,
  // and the newly created slug so the redirect destination renders fresh.
  // Publish notification emails are sent asynchronously by esdeveniments-backend
  // after transaction commit (EventPublishedEmailListener).
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

  // 3. Return the created event or result for your client
  return { success: true, event: created };
}

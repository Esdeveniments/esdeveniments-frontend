import type { CreateEventFailureReason, FormData } from "types/event";
import { EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR } from "./constants";

export function buildPublishContext(args: {
  form: FormData;
  imageFile: File | null;
}) {
  const { form, imageFile } = args;
  return {
    categories_count: Array.isArray(form.categories) ? form.categories.length : 0,
    has_image_file: Boolean(imageFile),
    has_email: Boolean(form.email),
    has_event_url: Boolean(form.url),
    has_town: Boolean(form.town),
    has_region: Boolean(form.region),
  };
}

export const ACTION_FAILURE_ANALYTICS_REASON: Record<
  CreateEventFailureReason,
  string
> = {
  "profile-incomplete": "profile-incomplete",
  "stale-session": "stale-session",
  duplicate: "duplicate",
  "image-too-large": "image_too_large",
  "invalid-image": "invalid_image",
  "body-limit": "body_limit",
  validation: "validation",
};

/**
 * Classifies actionable createEvent errors shared by the server action
 * (before Next.js redacts thrown messages in production) and the client
 * fallback catch block.
 */
export function matchCreateEventFailureReason(
  message: string,
  status?: number,
): Exclude<
  CreateEventFailureReason,
  "profile-incomplete" | "stale-session" | "invalid-image"
> | null {
  const normalized = message.toLowerCase();
  if (normalized.includes(EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR)) {
    return "image-too-large";
  }

  // When an HTTP status is known (server action), classify from status alone
  // so echoed user fields (e.g. a title containing "duplicate") in 400 or 500
  // bodies never get misreported as duplicate errors.
  if (typeof status === "number") {
    if (status === 413) return "body-limit";
    if (status === 409) return "duplicate";
    if (status === 400 || status === 422) return "validation";
    return null;
  }

  if (
    normalized.includes("status: 413") ||
    normalized.includes("request entity too large")
  ) {
    return "body-limit";
  }
  if (
    normalized.includes("duplicate") ||
    normalized.includes("integrity violation")
  ) {
    return "duplicate";
  }
  return null;
}

export function classifyPublishError(args: {
  isImageUploadLimit: boolean;
  isBodyLimit: boolean;
  isRequestTooLarge: boolean;
  isFormParsingError: boolean;
  isDuplicate: boolean;
}) {
  const {
    isImageUploadLimit,
    isBodyLimit,
    isRequestTooLarge,
    isFormParsingError,
    isDuplicate,
  } = args;

  if (isImageUploadLimit) return "image_too_large";
  if (isBodyLimit || isRequestTooLarge) return "body_limit";
  if (isFormParsingError) return "form_parsing";
  if (isDuplicate) return "duplicate";
  return "generic";
}


import type {
  CreateEventFailureReason,
  FormData,
  PublishAlertLevel,
  PublishErrorCategory,
} from "types/event";
import { EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR } from "./constants";
import {
  PUBLISH_ALERT_IMMEDIATE,
  PUBLISH_ALERT_SPIKE,
} from "./sentry-helpers";

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
}): PublishErrorCategory {
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

/**
 * Maps a non-OK backend HTTP status from POST /events to its Sentry
 * publish_alert tag. Returns null for 401/403 because createEventAction
 * emits the immediate auth alert (preventing duplicate emails per failure).
 */
export function getCreateEventHttpAlertLevel(
  status: number,
): PublishAlertLevel | null {
  if (status === 401 || status === 403) return null;
  if (status === 400 || status === 409 || status === 413 || status === 422) {
    return PUBLISH_ALERT_SPIKE;
  }
  return PUBLISH_ALERT_IMMEDIATE;
}

export function hasServerActionDigest(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.length > 0
  );
}

/**
 * Maps a client-side PublishForm error to its Sentry publish_alert level,
 * or null when no alert tag should be attached.
 *
 * - image_too_large: local file size validation (no Sentry capture)
 * - body_limit / duplicate: spike-only so one user error never pages
 * - form_parsing: immediate (broken multipart stream or proxy truncation)
 * - generic with Next.js digest: null (already alerted server-side)
 * - generic without digest: immediate (WAF 403, network/edge failure)
 */
export function getClientPublishAlertLevel(args: {
  category: PublishErrorCategory;
  hasServerDigest: boolean;
}): PublishAlertLevel | null {
  const { category, hasServerDigest } = args;
  if (category === "image_too_large") return null;
  if (category === "body_limit" || category === "duplicate") {
    return PUBLISH_ALERT_SPIKE;
  }
  if (category === "form_parsing") return PUBLISH_ALERT_IMMEDIATE;
  return hasServerDigest ? null : PUBLISH_ALERT_IMMEDIATE;
}


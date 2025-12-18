import type { FormData } from "types/event";
import { EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR } from "@utils/constants";

export function buildPublishContext(args: {
  form: FormData;
  imageFile: File | null;
  uploadedImageUrl: string | null;
}) {
  const { form, imageFile, uploadedImageUrl } = args;
  return {
    categories_count: Array.isArray(form.categories) ? form.categories.length : 0,
    has_image_file: Boolean(imageFile),
    has_image_url_input: Boolean(form.imageUrl || form.url),
    has_email: Boolean(form.email),
    has_event_url: Boolean(form.url),
    has_town: Boolean(form.town),
    has_region: Boolean(form.region),
    has_uploaded_image: Boolean(uploadedImageUrl),
  };
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

export function classifyUploadError(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "abort";
  }

  const message = error instanceof Error ? error.message : String(error);
  if (message === EVENT_IMAGE_UPLOAD_TOO_LARGE_ERROR) return "too_large";

  const lower = message.toLowerCase();
  if (
    lower.includes("network") ||
    lower.includes("failed to fetch") ||
    lower.includes("fetch") ||
    lower.includes("timeout")
  ) {
    return "network";
  }

  return "unknown";
}

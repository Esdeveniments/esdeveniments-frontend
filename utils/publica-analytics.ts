import type { FormData } from "types/event";

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


import {
  defaultEventFormZodLabels,
  type FormData,
  type EventFormZodLabels,
  type ValidationLabels,
} from "types/event";
import { normalizeUrl } from "./string-helpers";

const defaultValidationLabels: ValidationLabels = {
  genericError: "There are validation errors",
  imageRequired: "Image is required",
};

// Lightweight plain-JS replacement for the previous zod-based check.
// Kept intentionally zod-free so it can run in client components without
// pulling the zod runtime (~220 KB on form routes) into the client bundle.
// The authoritative validation still lives server-side (Server Action +
// backend API), so this only powers the disabled-button UX.
const isValidUrlWithHost = (val: string): boolean => {
  try {
    const url = new URL(val);
    return url.hostname.includes(".");
  } catch {
    return false;
  }
};

const isValidUrl = (val: string): boolean => {
  try {
    new URL(val);
    return true;
  } catch {
    return false;
  }
};

// Mirrors the regex zod 3/4 use internally for z.string().email()
const EMAIL_REGEX =
  /^(?!\.)(?!.*\.\.)([A-Z0-9_+\-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i;

export const getZodValidationState = (
  form: FormData,
  isPristine: boolean,
  imageFile?: File | null,
  isEditMode?: boolean,
  labels: ValidationLabels = defaultValidationLabels,
  formLabels: EventFormZodLabels = defaultEventFormZodLabels,
  imageUrl?: string | null
): { isDisabled: boolean; isPristine: boolean; message: string } => {
  const fail = (message: string) => ({ isDisabled: true, isPristine, message });

  if (!form.title || form.title.trim() === "") {
    return fail(formLabels.titleRequired);
  }
  if (!form.description || form.description.trim() === "") {
    return fail(formLabels.descriptionRequired);
  }
  if (!form.location || form.location.trim() === "") {
    return fail(formLabels.locationRequired);
  }

  // imageUrl: null/"" allowed; otherwise must be a URL with hostname containing "."
  if (form.imageUrl != null && form.imageUrl !== "") {
    if (!isValidUrlWithHost(form.imageUrl)) {
      return fail(formLabels.invalidUrl);
    }
  }

  // url: "" allowed; otherwise must be a valid URL (auto-normalized)
  const normalizedUrl = normalizeUrl(form.url);
  if (normalizedUrl && !isValidUrl(normalizedUrl)) {
    return fail(formLabels.invalidUrl);
  }

  // email: undefined/"" allowed; otherwise must look like an email
  if (form.email && form.email !== "" && !EMAIL_REGEX.test(form.email)) {
    return fail(formLabels.invalidEmail);
  }

  // Additional validation for image file (required for new events only)
  if (!isPristine && !isEditMode && !imageFile && !imageUrl) {
    return fail(labels.imageRequired);
  }

  return { isDisabled: false, isPristine, message: "" };
};

import {
  createEventFormSchema,
  defaultEventFormZodLabels,
  type EventFormSchemaType,
  type EventFormZodLabels,
  type ValidationLabels,
} from "types/event";
import { normalizeUrl } from "./string-helpers";

const defaultValidationLabels: ValidationLabels = {
  genericError: "There are validation errors",
  imageRequired: "Image is required",
};

export const getZodValidationState = (
  form: EventFormSchemaType,
  isPristine: boolean,
  imageFile?: File | null,
  isEditMode?: boolean,
  labels: ValidationLabels = defaultValidationLabels,
  formLabels: EventFormZodLabels = defaultEventFormZodLabels,
  imageUrl?: string | null
): { isDisabled: boolean; isPristine: boolean; message: string } => {
  // Normalize URL before validation (auto-add https:// if missing)
  const normalizedForm = {
    ...form,
    url: normalizeUrl(form.url),
  };
  const schema = createEventFormSchema(formLabels);
  const result = schema.safeParse(normalizedForm);
  if (!result.success) {
    // Collect first error message
    const firstError =
      Object.values(result.error.flatten().fieldErrors)[0]?.[0] ||
      labels.genericError;
    return { isDisabled: true, isPristine, message: firstError };
  }

  // Additional validation for image file (required for new events only)
  if (!isPristine && !isEditMode && !imageFile && !imageUrl) {
    return {
      isDisabled: true,
      isPristine,
      message: labels.imageRequired,
    };
  }

  return { isDisabled: false, isPristine, message: "" };
};

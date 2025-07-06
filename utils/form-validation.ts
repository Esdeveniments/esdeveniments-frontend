import { EventFormSchema, type EventFormSchemaType } from "types/event";

export const getZodValidationState = (
  form: EventFormSchemaType,
  isPristine: boolean,
  imageFile?: File | null,
  isEditMode?: boolean
): { isDisabled: boolean; isPristine: boolean; message: string } => {
  const result = EventFormSchema.safeParse(form);
  if (!result.success) {
    // Collect first error message
    const firstError =
      Object.values(result.error.flatten().fieldErrors)[0]?.[0] ||
      "Hi ha errors de validació";
    return { isDisabled: true, isPristine, message: firstError };
  }

  // Additional validation for image file (required for new events only)
  if (!isPristine && !imageFile && !isEditMode) {
    return {
      isDisabled: true,
      isPristine,
      message: "La imatge és obligatòria",
    };
  }

  return { isDisabled: false, isPristine, message: "" };
};

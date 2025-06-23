import { EventFormSchema, type EventFormSchemaType } from "types/event";

export const getZodValidationState = (
  form: EventFormSchemaType,
  isPristine: boolean
): { isDisabled: boolean; isPristine: boolean; message: string } => {
  if (!isPristine) {
    return { isDisabled: true, isPristine: true, message: "" };
  }
  const result = EventFormSchema.safeParse(form);
  if (!result.success) {
    // Collect first error message
    const firstError =
      Object.values(result.error.flatten().fieldErrors)[0]?.[0] ||
      "Hi ha errors de validació";
    return { isDisabled: true, isPristine: true, message: firstError };
  }
  return { isDisabled: false, isPristine: false, message: "" };
};

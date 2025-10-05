import type { TextareaSize, TextareaVariant } from "types/ui";

export const TEXTAREA_VARIANTS: Record<TextareaVariant, string> = {
  default: "",
  error: "border-error focus-visible:ring-error/20",
  success: "border-success focus-visible:ring-success/20",
};

export const TEXTAREA_SIZES: Record<TextareaSize, string> = {
  sm: "px-component-sm py-component-sm text-body-sm",
  md: "px-component-sm py-component-sm text-body-sm",
  lg: "px-component-md py-component-md text-body",
};

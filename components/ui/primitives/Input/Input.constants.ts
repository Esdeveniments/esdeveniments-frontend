import type { SizeToken } from "types/ui";

// Legacy size constants for backward compatibility
export const INPUT_SIZES: Record<Exclude<SizeToken, "xs" | "xl">, string> = {
  sm: "h-8 px-component-sm text-body-sm",
  md: "h-9 px-component-sm text-body-sm",
  lg: "h-10 px-component-md text-body-md",
};

// Variant maps using design tokens
export const INPUT_VARIANTS = {
  default: "",
  error: "border-error focus-visible:ring-error/20",
  success: "border-success focus-visible:ring-success/20",
} as const;

export const INPUT_BASE =
  "block w-full rounded-md border border-blackCorp/30 bg-whiteCorp text-blackCorp placeholder:text-blackCorp/40 shadow-sm transition focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 hover:border-blackCorp/40";

export const INPUT_INVALID =
  "aria-invalid:border-error aria-invalid:ring-2 aria-invalid:ring-error/20";

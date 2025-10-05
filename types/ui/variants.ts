/**
 * Shared variant tokens used across primitives and patterns.
 *
 * Consolidate visual variants (color, density, etc.) here to ensure
 * consistency between TypeScript types and implementation logic.
 */

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "muted"
  | "solid";
export type ButtonSize = "sm" | "md" | "lg";

export type BadgeVariant =
  | "default"
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "error";
export type BadgeSize = "sm" | "md" | "lg";

export type CardVariant =
  | "elevated"
  | "outlined"
  | "horizontal"
  | "compact"
  | "news";

export type SkeletonVariant =
  | "card"
  | "text"
  | "avatar"
  | "card-horizontal"
  | "card-compact"
  | "restaurant"
  | "share"
  | "image";

export type TextareaVariant = "default" | "error" | "success";
export type TextareaSize = "sm" | "md" | "lg";

export type SizeToken = "xs" | "sm" | "md" | "lg" | "xl";

export interface VariantConfig {
  /**
   * Maps variant keys to Tailwind class strings.
   */
  variants: Record<string, string>;
  /**
   * Maps size tokens to Tailwind class strings.
   */
  sizes?: Record<string, string>;
  /**
   * Default variant applied when none supplied.
   */
  defaultVariant?: string;
  /**
   * Default size applied when none supplied.
   */
  defaultSize?: string;
}

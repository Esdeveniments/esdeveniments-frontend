/**
 * Standardized spacing scale with 8 values, designed to reduce from 32 unique spacing values
 * to a cohesive design system. This scale provides responsive breakpoints for mobile-first design.
 *
 * Values are in rem units, with responsive scaling:
 * - base: mobile/tablet
 * - md: desktop and up
 */

export type SpacingToken =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl";

export type ResponsiveSpacingValue = {
  base: string;
  md: string;
};

export const spacing: Record<SpacingToken, ResponsiveSpacingValue> = {
  xs: { base: "0.25rem", md: "0.5rem" }, // Maps to Tailwind 1/2
  sm: { base: "0.5rem", md: "1rem" }, // Maps to Tailwind 2/4
  md: { base: "1rem", md: "1.5rem" }, // Maps to Tailwind 4/6
  lg: { base: "1.5rem", md: "2rem" }, // Maps to Tailwind 6/8
  xl: { base: "2rem", md: "2.5rem" }, // Maps to Tailwind 8/10
  "2xl": { base: "2.5rem", md: "3rem" }, // Maps to Tailwind 10/12
  "3xl": { base: "3rem", md: "4rem" }, // Maps to Tailwind 12/16
  "4xl": { base: "4rem", md: "6rem" }, // Maps to Tailwind 16/24
};

/**
 * Utility type for spacing props in components
 */
export type SpacingProps = {
  spacing?: SpacingToken;
};

/**
 * Date-related types for URL filtering
 * This file serves as the single source of truth for date validation
 *
 * Type Safety: By centralizing VALID_DATES here and exporting both the constant
 * and derived types, we ensure that:
 * 1. DateFunctions must match the valid date slugs exactly
 * 2. URL parsing uses the same validation logic
 * 3. TypeScript will catch mismatches at compile time
 */

// Valid date formats - this becomes the source of truth
export const VALID_DATES = [
  "tots",
  "avui",
  "dema",
  "setmana",
  "cap-de-setmana",
] as const;

// Export the type derived from the array
export type ValidDateSlug = (typeof VALID_DATES)[number];

// Type for date functions that must match ValidDateSlug keys (excluding "tots")
export type DateFunctions = {
  [K in ValidDateSlug as K extends "tots" ? never : K]: () => {
    from: Date;
    until: Date;
  };
};

/**
 * Type guard to check if a string is a valid date slug
 */
export function isValidDateSlug(value: string): value is ValidDateSlug {
  return VALID_DATES.includes(value as ValidDateSlug);
}

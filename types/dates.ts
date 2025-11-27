// Type definition - must be in /types directory
// Defined as union type to avoid circular dependency with lib/dates.ts
export type ValidDateSlug =
  | "tots"
  | "avui"
  | "dema"
  | "setmana"
  | "cap-de-setmana";

// Re-export runtime values from lib (no circular dependency for values)
export { VALID_DATES, isValidDateSlug } from "@lib/dates";

// Type for date functions that must match ValidDateSlug keys (excluding "tots")
export type DateFunctions = {
  [K in ValidDateSlug as K extends "tots" ? never : K]: () => {
    from: Date;
    until: Date;
  };
};

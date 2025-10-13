import { VALID_DATES, ValidDateSlug, isValidDateSlug } from "@lib/dates";

// Re-export for backward compatibility
export { VALID_DATES, isValidDateSlug };
export type { ValidDateSlug };

// Type for date functions that must match ValidDateSlug keys (excluding "tots")
export type DateFunctions = {
  [K in ValidDateSlug as K extends "tots" ? never : K]: () => {
    from: Date;
    until: Date;
  };
};

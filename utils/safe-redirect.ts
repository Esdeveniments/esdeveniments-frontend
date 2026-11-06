import { sanitizeReturnTo } from "@utils/redirect-safety";

/**
 * Validate a `?redirect=` query param before using it for navigation.
 *
 * Only same-origin relative paths are allowed. Delegates to sanitizeReturnTo
 * so every redirect entry point applies the same rule (protocol-relative
 * forms, backslashes, control characters, encoded separators, `..`).
 *
 * @returns the path when safe, otherwise `undefined`.
 */
export function getSafeRedirect(
  param: string | string[] | undefined
): string | undefined {
  if (typeof param !== "string") return undefined;
  return sanitizeReturnTo(param) ?? undefined;
}

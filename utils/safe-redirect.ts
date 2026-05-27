/**
 * Validate a `?redirect=` query param before using it for navigation.
 *
 * Only same-origin relative paths are allowed. Anything else (absolute URLs,
 * protocol-relative `//host`, non-strings) is rejected to prevent open-redirect
 * attacks where an attacker crafts `?redirect=https://evil.example`.
 *
 * @returns the path when safe, otherwise `undefined`.
 */
export function getSafeRedirect(
  param: string | string[] | undefined
): string | undefined {
  if (typeof param !== "string") return undefined;
  if (!param.startsWith("/")) return undefined;
  if (param.startsWith("//")) return undefined;
  return param;
}

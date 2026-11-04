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
  // Browsers normalize "\" to "/", so "/\evil.com" resolves to the
  // protocol-relative "//evil.com". Reject a "/" or "\" in the second
  // position, and any backslash anywhere, to close that bypass.
  if (param[1] === "/" || param[1] === "\\") return undefined;
  if (param.includes("\\")) return undefined;
  return param;
}

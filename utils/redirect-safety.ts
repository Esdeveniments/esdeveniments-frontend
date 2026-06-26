/**
 * Only allow safe relative paths to prevent open-redirect attacks. Rejects
 * protocol-relative (`//`), backslash tricks (`/\`) that browsers normalize to
 * `//`, raw control characters, and percent-encoded slashes/backslashes
 * (`%2f`, `%5c`) and control chars (`%0d`, `%0a`, `%09`) that decode into `//`
 * or enable header injection. Shared by the OIDC routes and the middleware so
 * the login entry point and the sign-in route sanitize identically.
 */
// Cap length so a huge ?redirect= can't produce an oversized Set-Cookie header.
const MAX_RETURN_TO_LENGTH = 2048;

export function sanitizeReturnTo(
  value: string | null | undefined,
): string | null {
  if (typeof value !== "string") return null;
  if (value.length > MAX_RETURN_TO_LENGTH) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  if (value.includes("\\")) return null;
  if (/%2[fF]|%5[cC]|%0[9aAdD]/.test(value)) return null;
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) < 0x20) return null;
  }
  return value;
}

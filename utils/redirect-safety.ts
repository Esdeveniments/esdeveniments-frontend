/**
 * Only allow safe relative paths to prevent open-redirect attacks. Rejects
 * protocol-relative (`//`), backslash tricks (`/\`) that browsers normalize to
 * `//`, raw control characters, and percent-encoded slashes/backslashes
 * (`%2f`, `%5c`) and control chars (`%0d`, `%0a`, `%09`) that decode into `//`
 * or enable header injection, and `..` segments (also `%2e`-encoded) in the
 * path or query, which can resolve or later be resolved to `//`. Shared by the
 * OIDC routes, the middleware and getSafeRedirect so every redirect entry
 * point sanitizes identically.
 */
// Cap length so a huge ?redirect= can't produce an oversized Set-Cookie header.
// Measured in encoded bytes (non-ASCII paths can exceed the per-cookie limit).
const MAX_RETURN_TO_BYTES = 2048;

function isDotDotSegment(segment: string): boolean {
  return segment.replace(/%2e/gi, ".") === "..";
}

export function sanitizeReturnTo(
  value: string | null | undefined,
): string | null {
  if (typeof value !== "string") return null;
  if (new TextEncoder().encode(value).length > MAX_RETURN_TO_BYTES) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  if (value.includes("\\")) return null;
  if (/%2[fF]|%5[cC]|%0[9aAdD]/.test(value)) return null;
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return null; // C0 control chars + DEL
  }
  if (value.split(/[/?#&=]/).some(isDotDotSegment)) return null;
  return value;
}

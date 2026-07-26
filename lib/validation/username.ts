import { z } from "zod";

/**
 * Reserved usernames per backend handoff. Backend returns 409 for taken
 * usernames; this list is enforced client-side as defense in depth and
 * to surface the same error before a network round-trip.
 */
export const RESERVED_USERNAMES: readonly string[] = [
  "admin",
  "api",
  "auth",
  "eventos",
  "usuarios",
  "me",
  "login",
  "logout",
] as const;

// Username rules:
// - 3 to 30 characters
// - lower-case letters, digits, hyphens only
// - no leading/trailing hyphen, no consecutive hyphens
// - cannot start with "user-" (auto-generated temp user namespace)
// - cannot be a reserved word
//
// Exported so non-Zod callers (utils/username-validation.ts) can apply the
// same regex without re-declaring it — the backend is authoritative and
// dual rules drifting apart would silently 400 on save.
export const MATCH_USERNAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const RESERVED_USER_PREFIX = /^user-/;

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "usernameTooShort")
  .max(30, "usernameTooLong")
  .regex(MATCH_USERNAME_RE, "usernameInvalidChars")
  .refine((value) => !RESERVED_USER_PREFIX.test(value), {
    message: "usernameReservedPrefix",
  })
  .refine((value) => !RESERVED_USERNAMES.includes(value.toLowerCase()), {
    message: "usernameReserved",
  });


import {
  MATCH_USERNAME_RE,
  RESERVED_USER_PREFIX,
  RESERVED_USERNAMES,
} from "lib/validation/username";
import type { UsernameValidationResult } from "types/api/auth-validation";

/**
 * Pure username validation. Mirrors backend rules and produces a code
 * suitable for translation lookup.
 *
 * Rule literals (MATCH_USERNAME_RE, RESERVED_USER_PREFIX) are imported
 * from `lib/validation/username.ts` so client-side realtime feedback
 * never drifts from the Zod schema (or from the backend).
 */
export function validateUsername(raw: string): UsernameValidationResult {
  const value = (raw ?? "").trim().toLowerCase();

  if (value.length < 3) {
    return { ok: false, code: "usernameTooShort" };
  }
  if (value.length > 30) {
    return { ok: false, code: "usernameTooLong" };
  }
  if (!MATCH_USERNAME_RE.test(value)) {
    return { ok: false, code: "usernameInvalidChars" };
  }
  if (RESERVED_USER_PREFIX.test(value)) {
    return { ok: false, code: "usernameReservedPrefix" };
  }
  if ((RESERVED_USERNAMES as readonly string[]).includes(value)) {
    return { ok: false, code: "usernameReserved" };
  }
  return { ok: true };
}

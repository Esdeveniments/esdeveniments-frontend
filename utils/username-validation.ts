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
 *
 * Note: we deliberately do NOT lowercase the input before validation,
 * so client and `usernameSchema` semantics match exactly. The lowercase
 * regex (`MATCH_USERNAME_RE`) already rejects uppercase characters, so
 * accepting them here would lead to a client "ok" verdict that the
 * backend then 400s on save.
 */
export function validateUsername(raw: string): UsernameValidationResult {
  const value = (raw ?? "").trim();

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

/**
 * True while `username` is still the backend's auto-generated fallback
 * (the `user-<hash>` pattern assigned before onboarding). Centralizes the
 * "has this account ever set a real username" check so every caller
 * (onboarding copy, the one-time username lock) shares one definition
 * instead of re-testing RESERVED_USER_PREFIX ad hoc.
 */
export function isPlaceholderUsername(username: string): boolean {
  return RESERVED_USER_PREFIX.test(username);
}

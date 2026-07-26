// Client-side validation types for the 2026-07-25 Logto/Auth handoff.
// Lives in /types/ per the project's type-system-governance rule
// (no TSTypeAliasDeclaration / TSInterfaceDeclaration outside /types/).
//
// Modules that previously declared these types re-export them here so
// existing import paths (`import type { … } from "lib/…"` and
// `import type { … } from "utils/…"`) continue to work.

/** Error codes raised by the username validator (utils/username-validation.ts). */
export type UsernameErrorCode =
  | "usernameTooShort"
  | "usernameTooLong"
  | "usernameInvalidChars"
  | "usernameReservedPrefix"
  | "usernameReserved"
  | "usernameTaken"
  | "usernameInvalid";

/** Result of pure username validation. */
export interface UsernameValidationResult {
  ok: boolean;
  code?: UsernameErrorCode;
}

/**
 * Structural shape accepted by `getProfileSlug`. Both `ProfileSlugUser`
 * (legacy Logto) and `OwnerSummaryDTO` (2026-07-25 backend) only need
 * `id` + `username` for a safe URL slug. `displayName` is the new
 * `OwnerSummaryDTO` fallback used when `name` is absent.
 */
export type ProfileSlugSource = {
  id?: string;
  username?: string | null;
  // Legacy `ProfileSlugUser` fields (used when `username` is unsafe);
  // kept so never-unsafe legacy callers still type-check.
  name?: string;
  email?: string;
  // 2026-07-25 `OwnerSummaryDTO` fields. `displayName` is the fallback
  // when `name` is absent; the others are unused by `getProfileSlug` today
  // but accepted here so callers that already carry a full
  // `OwnerSummaryDTO` don't have to type-cast into a wider shape.
  // Renderers MUST NOT treat null `displayName` as the on-screen name —
  // that is a UI copy decision (see auth-cookie-migration followup).
  displayName?: string | null;
  avatarUrl?: string | null;
  organizerVerified?: boolean;
};

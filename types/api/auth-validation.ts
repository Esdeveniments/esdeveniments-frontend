// Client-side validation types for the 2026-07-25 Logto/Auth handoff.
// Lives in /types/ per the project's type-system-governance rule
// (no TSTypeAliasDeclaration / TSInterfaceDeclaration outside /types/).
//
// Modules that previously declared these types re-export them here so
// existing import paths (`import type { … } from "lib/…"` and
// `import type { … } from "utils/…"`) continue to work.

/**
 * Mirrors `profileUpdateSchema` in `lib/validation/auth.ts`. Defined as
 * an explicit interface (not `z.infer<typeof profileUpdateSchema>`) so the
 * /types/ tree doesn't have to depend on a lib/ Zod schema.
 */
export interface ProfileUpdateInput {
  username: string;
  displayName: string;
  bio?: string | null;
}

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
 * `id` + `username` for a safe URL slug.
 */
export type ProfileSlugSource = {
  id?: string;
  username?: string | null;
  // Legacy fields (kept for backward compat with the old `ProfileSlugUser`
  // shape; ignored unless `username` is unsafe).
  name?: string;
  email?: string;
};

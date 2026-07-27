import { sanitize } from "@utils/sanitize-segment";
import type { ProfileSlugSource } from "types/api/auth-validation";

/** Matches standard hyphenated UUID formats (v1\u2013v5). */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when the value is a raw UUID that should never appear in a URL. */
function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * Build a URL-safe profile slug for a user.
 * Prefers the server-slugified username, falls back to a slugified display
 * name, and returns an empty string when no safe slug is available. Never
 * exposes email addresses or raw UUIDs.
 */
export function getProfileSlug(
  user: ProfileSlugSource | null | undefined,
): string {
  if (!user) return "";

  // Never expose email addresses or raw UUIDs in profile URLs. If the server
  // ever returns either as a username, treat it as unavailable.
  const username = user.username?.trim();
  if (username && !username.includes("@") && !isUuid(username)) {
    return username;
  }

  // Some identity providers set `name` to the email address when no display
  // name is configured. Sanitizing that would still expose the email in the
  // URL, so treat it as unavailable. Also reject UUIDs and the fallback slug
  // "n-a" produced by sanitize() when no slug-safe characters remain.
  // The 2026-07-25 backend shape (OwnerSummaryDTO) carries displayName
  // instead of name; read it as a fallback for the new shape.
  //
  // Intentional `||` (not `??`): when `name` trims to `""` (whitespace-only
  // input from the identity provider), fall through to `displayName`
  // rather than binding an empty string here. `??` would only coalesce
  // null/undefined; an empty string left bound would be rejected by the
  // downstream `if (name && ...)` guard and the call would fall through
  // to `return user.username` or `""` instead of `displayName`. Using
  // `||` makes the empty-string fall-through explicit (and produces a
  // useful slug from `displayName` when one is available). PR review
  // thread 121i flagged the previous comment as inaccurate; this is the
  // corrected version.
  //
  // 2026-07-26 round-5: also reject when `name === user.id`. Logto
  // populates the id_token `name` claim with the Logto `sub` (an
  // alphanumeric identifier like `a10mgbryoklh`) when the user has no
  // configured display name. Without this guard, sanitize() lowercases
  // that string and we linked the navbar to `/perfil/<sub>`, which the
  // backend (keyed by UUID) could never resolve. The defence in depth
  // here pairs with the NavbarClient guard `!user.profileEnrichmentFailed`.
  //
  // 2026-07-27: `user.id` alone isn't enough once enrichment has run —
  // enrichWithBackendProfile replaces `id` with the backend UUID and moves
  // the original Logto sub to `logtoId`. A user whose backend record has no
  // displayName yet (e.g. still mid-onboarding) keeps `name` at the Logto
  // sub, which by then differs from the (now backend-UUID) `id`, so the
  // `name !== user.id` check alone no longer catches it. Reject against
  // BOTH so this holds pre- and post-enrichment.
  //
  // 2026-07-27 (later): the actual source of the bad value is now fixed at
  // mapUserInfoToAuthUser (lib/auth/logto.ts) — `name` can no longer equal
  // the sub in the first place, since that's the single point every AuthUser
  // is built from raw Logto claims. These id/logtoId checks are kept as
  // cheap defense-in-depth, not the primary defense — don't remove them on
  // the assumption the upstream fix makes them redundant.
  const name = (user.name?.trim() || user.displayName?.trim());
  if (
    name &&
    !name.includes("@") &&
    name !== user.email &&
    !isUuid(name) &&
    name !== user.id &&
    name !== user.logtoId
  ) {
    const slug = sanitize(name);
    if (slug && slug !== "n-a") return slug;
  }

  return "";
}

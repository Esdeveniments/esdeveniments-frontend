import "server-only";
import { getAuthenticatedUserExternal } from "@lib/api/users-external";
import type { AuthenticatedUserDTO } from "types/api/user";
import type { AuthUser } from "types/auth";

/**
 * Layers the backend-owned profile on top of the id_token-derived user.
 *
 * Failure handling — the bug surfaced by the 2026-07-25 Logto onboarding
 * deployment: when the backend doesn't trust the access_token (audience
 * mismatch, JWT key not in JWKS, etc.), `getAuthenticatedUserExternal`
 * throws with `.status = 4xx`. If we silently `return user` like before,
 * the navbar shows the user as logged-in but `username` is empty so
 * `getProfileSlug(user)` returns "" and the profile link disappears. The
 * user reports "I can't see my profile in the menu" with no breadcrumb to
 * the actual cause.
 *
 * To fix: catch the thrown status, tag the result with
 * `profileEnrichmentFailed: "auth"`, so the navbar can render an honest
 * warning ("⚠️ Session incomplete — log out and back in") instead of a
 * missing menu item. 5xx / network errors are handled differently: they're
 * silently swallowed (the id_token IS valid on its own), returning `user`
 * unchanged with no tag at all — the next successful enrichment call
 * naturally recovers, so there's no separate "transient" state to represent.
 *
 * Successful enrichment: backend UUID replaces Logto `sub` as `id`, display
 * name/username are layered when they're an upgrade over the Logto
 * defaults, and avatarUrl/pictureSource/role/lastLoginAt/emailVerified come
 * from the backend.
 */
export async function enrichWithBackendProfile(
  user: AuthUser,
  accessToken: string | null,
): Promise<AuthUser> {
  if (!accessToken) return user;

  let backendUser: AuthenticatedUserDTO | null;
  try {
    backendUser = await getAuthenticatedUserExternal(accessToken);
  } catch (err) {
    const status = (err as { status?: number })?.status;
    if (status === 401 || status === 403 || status === 400) {
      // Backend rejected the Bearer. Future Bearer calls will also fail;
      // surface an honest warning in the navbar so the user can tell the
      // session isn't fully accepted.
      return { ...user, profileEnrichmentFailed: "auth" };
    }
    // 5xx / network blip: the id_token alone is still a valid session — keep
    // it silently rather than visually logging the user out. The next
    // SWR / refresh will naturally retry. (UX note: a transient outage
    // means the profile menu is missing for ~minutes; that's a fair tradeoff
    // against flashing a "log out and back in" warning that wouldn't help.)
    return user;
  }
  if (!backendUser) return user;

  // Logto sometimes returns the email as the user's name. Prefer the
  // backend-owned display name and username so the navbar links to the same
  // public profile slug as event pages do. Reject any value that looks like
  // an email address to avoid exposing it in the UI or URLs.
  // 2026-07-25 backend: displayName is canonical; name is the legacy alias
  // accepted by the parser. Three-way pick: displayName if cleanly better,
  // legacy name if cleanly better, otherwise keep the id_token-derived name.
  // We `?? user.name` on each backend candidate so the narrowed type is
  // always `string` (matches `AuthUser.name: string`), not `string | undefined`.
  const displayNameIsBetter =
    !!backendUser.displayName &&
    backendUser.displayName !== user.email &&
    backendUser.displayName !== user.name &&
    !backendUser.displayName.includes("@");
  const legacyNameIsBetter =
    !displayNameIsBetter &&
    !!backendUser.name &&
    backendUser.name !== user.email &&
    backendUser.name !== user.name &&
    !backendUser.name.includes("@");
  const mergedName: string = displayNameIsBetter
    ? backendUser.displayName ?? user.name
    : legacyNameIsBetter
      ? backendUser.name ?? user.name
      : user.name;
  const backendUsernameIsBetter =
    backendUser.username &&
    backendUser.username.trim() !== "" &&
    backendUser.username !== user.username &&
    !backendUser.username.includes("@");

  // Each backend candidate falls back to `user.username` via `?? user.username`
  // so the narrowed type is `string` (matches `AuthUser.username: string`).
  const mergedUsername: string =
    (backendUsernameIsBetter ? backendUser.username : undefined) ??
    user.username;

  return {
    ...user,
    // Use the backend UUID as the canonical user id so server-side ownership
    // checks (e.g., event creator) match the ids stored in backend records.
    id: backendUser.id ?? user.id,
    logtoId: user.id,
    name: mergedName,
    username: mergedUsername,
    // 2026-07-25 backend: avatarUrl is the canonical field; pictureUrl is a
    // legacy alias still accepted by the parser.
    avatarUrl: backendUser.avatarUrl ?? backendUser.pictureUrl ?? user.avatarUrl,
    pictureSource: backendUser.pictureSource,
    role: backendUser.role ?? user.role,
    lastLoginAt: backendUser.lastLoginAt,
    profileCompleted: backendUser.profileCompleted,
    bio: backendUser.bio,
    // Backend is authoritative here too — falls back to the id_token claim
    // only if the backend didn't send one.
    emailVerified: backendUser.emailVerified ?? user.emailVerified,
  };
}

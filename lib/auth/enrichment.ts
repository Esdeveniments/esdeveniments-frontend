import "server-only";
import { getAuthenticatedUserExternal } from "@lib/api/users-external";
import type { AuthUser } from "types/auth";

/**
 * Layers the backend-owned profile on top of the id_token-derived user. The
 * backend call is best-effort: an unreachable/misconfigured backend must not
 * break the session, since the id_token alone is already a valid, verified
 * session.
 *
 * Core identity: the backend UUID replaces the Logto `sub` as the canonical
 * `id` so server-side ownership checks (e.g., "is this user the event
 * creator?") match the ids stored in backend records. The original Logto sub
 * is preserved as `logtoId` for debugging/auditing.
 *
 * Display fields (name/username) are replaced when the backend provides a
 * better value (e.g. Logto returns the email as name). Backend-only fields
 * (pictureUrl/pictureSource/role/lastLoginAt) are always layered on.
 */
export async function enrichWithBackendProfile(
  user: AuthUser,
  accessToken: string | null,
): Promise<AuthUser> {
  if (!accessToken) return user;
  const backendUser = await getAuthenticatedUserExternal(accessToken);
  if (!backendUser) return user;

  // Logto sometimes returns the email as the user's name. Prefer the
  // backend-owned display name and username so the navbar links to the same
  // public profile slug as event pages do. Reject any value that looks like
  // an email address to avoid exposing it in the UI or URLs.
  const backendNameIsBetter =
    backendUser.name &&
    backendUser.name !== user.email &&
    backendUser.name !== user.name &&
    !backendUser.name.includes("@");
  const backendUsernameIsBetter =
    backendUser.username &&
    backendUser.username.trim() !== "" &&
    backendUser.username !== user.username &&
    !backendUser.username.includes("@");

  return {
    ...user,
    // Use the backend UUID as the canonical user id so server-side ownership
    // checks (e.g., event creator) match the ids stored in backend records.
    id: backendUser.id ?? user.id,
    logtoId: user.id,
    name: backendNameIsBetter ? backendUser.name : user.name,
    username: backendUsernameIsBetter ? backendUser.username : user.username,
    avatarUrl: backendUser.pictureUrl ?? user.avatarUrl,
    pictureSource: backendUser.pictureSource,
    role: backendUser.role ?? user.role,
    lastLoginAt: backendUser.lastLoginAt,
  };
}

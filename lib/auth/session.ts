import "server-only";
import {
  getLogtoConfig,
  mapClaimsToAuthUser,
  verifyStoredIdToken,
} from "@lib/auth/logto";
import { getIdTokenFromCookies } from "@utils/auth-cookies";
import type { AuthUser } from "types/auth";

/**
 * Resolve the current authenticated user from the verified id_token cookie.
 *
 * This is intentionally lightweight: it does not refresh tokens or call the
 * backend userinfo endpoint. It is meant for server-side authorization checks
 * (e.g., "is this user the event creator?") where we only need a stable user
 * id from the verified session.
 *
 * Returns null when there is no session or the id_token cannot be verified.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const idToken = await getIdTokenFromCookies();
    if (!idToken) return null;

    const config = getLogtoConfig();
    const claims = await verifyStoredIdToken(config, idToken);
    return mapClaimsToAuthUser(claims);
  } catch {
    // Any failure to read/verify the session is treated as unauthenticated.
    return null;
  }
}

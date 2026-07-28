import "server-only";
import { cache } from "react";
import {
  getLogtoConfig,
  mapClaimsToAuthUser,
  verifyStoredIdToken,
} from "@lib/auth/logto";
import { enrichWithBackendProfile } from "@lib/auth/enrichment";
import {
  getAccessTokenFromCookies,
  getIdTokenFromCookies,
} from "@utils/auth-cookies";
import type { AuthUser } from "types/auth";

/**
 * Resolve the current authenticated user from the verified id_token cookie.
 *
 * The id_token yields the Logto `sub` as `user.id`. For creator-ownership
 * checks (e.g., "is this user the event creator?"), we need the **backend
 * UUID** — which is what `event.owner.id` stores. When an access
 * token is available, we enrich via `GET /api/auth/me` to replace `id` with
 * the backend UUID (preserving the Logto sub as `logtoId`). The enrichment is
 * best-effort: if the backend is unreachable, the id_token-only user is
 * returned (creator checks will simply fail with 404/403, not crash).
 *
 * Returns null when there is no session or the id_token cannot be verified.
 */
async function getCurrentUserInternal(): Promise<AuthUser | null> {
  try {
    const idToken = await getIdTokenFromCookies();
    if (!idToken) return null;

    const config = getLogtoConfig();
    const claims = await verifyStoredIdToken(config, idToken);
    const user = mapClaimsToAuthUser(claims);

    // Enrich with the backend UUID so creator-ownership checks match.
    // `enrichWithBackendProfile` handles its own throws for known paths
    // (4xx Bearer rejection -> profileEnrichmentFailed: "auth"; 5xx /
    // network blip -> silently swallowed so a transient outage doesn't
    // visually look like a logout). The outer try-catch is a last-resort
    // safety net for genuinely unforeseen throws (e.g. cookie read failed),
    // where falling back to the bare id_token user is the correct degraded
    // state.
    try {
      const accessToken = await getAccessTokenFromCookies();
      return await enrichWithBackendProfile(user, accessToken);
    } catch (enrichError) {
      console.error("getCurrentUser: enrichment threw unexpectedly, returning id_token-only user", enrichError);
      return user;
    }
  } catch {
    // Any failure to read/verify the session is treated as unauthenticated.
    return null;
  }
}

// Wrap in React cache() so multiple server components/actions calling
// getCurrentUser() in the same request share a single backend enrichment call
// (avoids redundant GET /auth/me round-trips within one request cycle).
export const getCurrentUser = cache(getCurrentUserInternal);

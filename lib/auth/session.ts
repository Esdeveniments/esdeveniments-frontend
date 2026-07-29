import "server-only";
import { cache } from "react";
import {
  getLogtoConfig,
  mapClaimsToAuthUser,
  refreshAccessToken,
  verifyStoredIdToken,
} from "@lib/auth/logto";
import { enrichWithBackendProfile } from "@lib/auth/enrichment";
import {
  getAccessTokenFromCookies,
  getIdTokenFromCookies,
} from "@utils/auth-cookies";
import type { AuthUser, SessionResolution } from "types/auth";

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
    // visually look like a logout). This try-catch is a last-resort safety
    // net for genuinely unforeseen throws around enrichment itself (e.g.
    // getAccessTokenFromCookies() failing) — falling back to the bare
    // id_token user here is the correct degraded state, since the id_token
    // was already verified above. This is distinct from the function-level
    // catch below, which covers failures reading/verifying the session
    // itself (no id_token to fall back to) and treats those as unauthenticated.
    try {
      const accessToken = await getAccessTokenFromCookies();
      return await enrichWithBackendProfile(user, accessToken);
    } catch (enrichError) {
      console.error("getCurrentUser: enrichment threw unexpectedly, returning id_token-only user", enrichError);
      return user;
    }
  } catch {
    // Any failure to read/verify the session (before we'd have a valid
    // id_token-derived user to fall back to) is treated as unauthenticated.
    return null;
  }
}

// Wrap in React cache() so multiple server components/actions calling
// getCurrentUser() in the same request share a single backend enrichment call
// (avoids redundant GET /auth/me round-trips within one request cycle).
export const getCurrentUser = cache(getCurrentUserInternal);

/**
 * Pure session-state decision tree for GET /api/auth/me: given the three
 * token cookies (already read + decrypted by the caller), decides whether
 * the session is valid, needs a token refresh, or should be treated as
 * logged out — without touching NextResponse/cookie plumbing itself. The
 * route handler maps the result to a response and calls setTokenCookies /
 * clearTokenCookies as directed.
 *
 * Mirrors the id_token-first, refresh-as-fallback shape of getCurrentUser
 * above, plus the refresh-token and cookie-clearing logic GET /api/auth/me
 * needs that getCurrentUser doesn't (it has no refresh token to fall back
 * to and never needs to signal "clear cookies").
 *
 * A transient id_token verification failure (JWKS unreachable) intentionally
 * short-circuits straight to `{kind: "transient"}` WITHOUT attempting a
 * refresh, even when a refresh token is available — verifyStoredIdToken
 * tags that failure `.transient = true` and it's rethrown out of the inner
 * try before the refresh branch runs. A non-transient failure (expired,
 * bad signature, wrong issuer/audience) instead falls through to the
 * refresh attempt below.
 */
export async function resolveSession(input: {
  idToken: string | null;
  refreshToken: string | null;
  accessToken: string | null;
  hasRawCookie: boolean;
}): Promise<SessionResolution> {
  const { idToken, refreshToken, accessToken, hasRawCookie } = input;

  if (!idToken && !refreshToken) {
    // Raw cookies present but undecryptable (rotated/corrupted secret) → clear
    // them so the client isn't stuck resending broken cookies.
    return { kind: "unauthorized", clearCookies: hasRawCookie };
  }

  // Set once a verified id_token yields a base user. A missing/failed refresh
  // below must never log this session out if this is non-null — the id_token
  // is already a valid, verified session on its own; a stale/absent access
  // token only means enrichment (and access-token restoration) isn't possible
  // right now.
  let user: AuthUser | null = null;

  try {
    const config = getLogtoConfig();

    // Try the stored id_token first (signature + iss/aud/exp; no nonce here).
    if (idToken) {
      try {
        const claims = await verifyStoredIdToken(config, idToken);
        user = mapClaimsToAuthUser(claims);
        // accessToken may be missing/expired (shorter-lived cookie than
        // id_token) even though the id_token itself is still valid — fall
        // through to the refresh block to restore it instead of returning a
        // session with no bearer, which would 401 every other authed
        // endpoint (favorites, backend enrichment) until the id_token itself
        // expires and forces a refresh.
        if (accessToken) {
          return {
            kind: "ok",
            user: await enrichWithBackendProfile(user, accessToken),
          };
        }
      } catch (e) {
        // A transient verification failure (JWKS unreachable) must NOT log the
        // user out — let it bubble to the transient path. Only definitive
        // failures (expired/invalid token) fall through to a refresh attempt.
        if ((e as { transient?: boolean })?.transient) throw e;
      }
    }

    if (!refreshToken) {
      if (user) return { kind: "ok", user };
      return { kind: "unauthorized", clearCookies: true };
    }

    // Refresh → new tokens (incl. a fresh id_token) → derive the user from it.
    const refreshed = await refreshAccessToken(config, refreshToken);
    if (!refreshed.id_token) {
      if (user) return { kind: "ok", user };
      return { kind: "unauthorized", clearCookies: true };
    }
    const claims = await verifyStoredIdToken(config, refreshed.id_token);
    // Use the freshly refreshed access token, not the (possibly stale) cookie.
    const refreshedUser = await enrichWithBackendProfile(
      mapClaimsToAuthUser(claims),
      refreshed.access_token,
    );
    return { kind: "ok", user: refreshedUser, refreshedTokens: refreshed };
  } catch (e) {
    const status = (e as { status?: number })?.status;
    // Definitive auth failure (e.g. refresh token revoked/expired). Only log
    // out if we never had a valid id_token-derived session to fall back on.
    if (status === 400 || status === 401 || status === 403) {
      if (user) return { kind: "ok", user };
      return { kind: "unauthorized", clearCookies: true };
    }
    // Transient (5xx, network, timeout): keep the session, signal retry.
    console.error("[resolveSession] transient session check failure", e);
    return { kind: "transient" };
  }
}

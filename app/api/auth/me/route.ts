import { NextResponse, type NextRequest } from "next/server";
import {
  getLogtoConfig,
  mapClaimsToAuthUser,
  refreshAccessToken,
  verifyStoredIdToken,
} from "@lib/auth/logto";
import { getAuthenticatedUserExternal } from "@lib/api/users-external";
import {
  ACCESS_TOKEN_COOKIE,
  ID_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearTokenCookies,
  readTokenFromRequest,
  setTokenCookies,
} from "@utils/auth-cookies";
import type { AuthUser } from "types/auth";

const NO_STORE = { "Cache-Control": "no-store" } as const;

// Layers the backend-owned profile (pictureUrl/pictureSource/role/lastLoginAt)
// on top of the id_token-derived user. The backend call is best-effort: an
// unreachable/misconfigured backend must not break login, since the
// id_token alone is already a valid, verified session.
async function enrichWithBackendProfile(
  user: AuthUser,
  accessToken: string | null,
): Promise<AuthUser> {
  if (!accessToken) return user;
  const backendUser = await getAuthenticatedUserExternal(accessToken);
  if (!backendUser) return user;
  return {
    ...user,
    id: backendUser.id,
    email: backendUser.email,
    name: backendUser.name,
    username: backendUser.username,
    avatarUrl: backendUser.pictureUrl ?? user.avatarUrl,
    pictureSource: backendUser.pictureSource,
    role: backendUser.role ?? user.role,
    lastLoginAt: backendUser.lastLoginAt,
  };
}

// Returns the current user from the verified id_token cookie — no userinfo
// round-trip, so it works even when the access token is bound to a backend API
// resource (aud != userinfo). If the id_token has expired, transparently
// refreshes via the refresh token. Distinguishes a definitive auth failure
// (clear cookies → 401) from a transient Logto outage (preserve cookies → 503).
// Backend-owned profile fields are layered on afterwards (enrichWithBackendProfile).
export async function GET(request: NextRequest): Promise<Response> {
  const idToken = readTokenFromRequest(request, ID_TOKEN_COOKIE);
  const refreshToken = readTokenFromRequest(request, REFRESH_TOKEN_COOKIE);
  const accessToken = readTokenFromRequest(request, ACCESS_TOKEN_COOKIE);

  const unauthorized = (): Response => {
    const response = NextResponse.json(
      { user: null },
      { status: 401, headers: NO_STORE },
    );
    clearTokenCookies(response);
    return response;
  };

  if (!idToken && !refreshToken) {
    // Raw cookies present but undecryptable (rotated/corrupted secret) → clear
    // them so the client isn't stuck resending broken cookies.
    const hasRawCookie =
      request.cookies.has(ID_TOKEN_COOKIE) ||
      request.cookies.has(ACCESS_TOKEN_COOKIE) ||
      request.cookies.has(REFRESH_TOKEN_COOKIE);
    return hasRawCookie
      ? unauthorized()
      : NextResponse.json({ user: null }, { status: 401, headers: NO_STORE });
  }

  try {
    const config = getLogtoConfig();

    // Try the stored id_token first (signature + iss/aud/exp; no nonce here).
    if (idToken) {
      try {
        const claims = await verifyStoredIdToken(config, idToken);
        const user = await enrichWithBackendProfile(
          mapClaimsToAuthUser(claims),
          accessToken,
        );
        return NextResponse.json(
          { user },
          { status: 200, headers: NO_STORE },
        );
      } catch (e) {
        // A transient verification failure (JWKS unreachable) must NOT log the
        // user out — let it bubble to the 503 path. Only definitive failures
        // (expired/invalid token) fall through to a refresh attempt.
        if ((e as { transient?: boolean })?.transient) throw e;
      }
    }

    if (!refreshToken) return unauthorized();

    // Refresh → new tokens (incl. a fresh id_token) → derive the user from it.
    const refreshed = await refreshAccessToken(config, refreshToken);
    if (!refreshed.id_token) return unauthorized();
    const claims = await verifyStoredIdToken(config, refreshed.id_token);
    // Use the freshly refreshed access token, not the (possibly stale) cookie.
    const user = await enrichWithBackendProfile(
      mapClaimsToAuthUser(claims),
      refreshed.access_token,
    );
    const response = NextResponse.json(
      { user },
      { status: 200, headers: NO_STORE },
    );
    setTokenCookies(response, refreshed);
    return response;
  } catch (e) {
    const status = (e as { status?: number })?.status;
    // Definitive auth failure (e.g. refresh token revoked/expired) → log out.
    if (status === 400 || status === 401 || status === 403) {
      return unauthorized();
    }
    // Transient (5xx, network, timeout): keep the session, signal retry.
    console.error("[/api/auth/me] transient session check failure", e);
    return NextResponse.json({ user: null }, { status: 503, headers: NO_STORE });
  }
}

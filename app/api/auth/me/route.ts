import { NextResponse, type NextRequest } from "next/server";
import {
  fetchUserInfo,
  getLogtoConfig,
  mapUserInfoToAuthUser,
  refreshAccessToken,
} from "@lib/auth/logto";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearTokenCookies,
  setTokenCookies,
} from "@utils/auth-cookies";

const NO_STORE = { "Cache-Control": "no-store" } as const;

// Returns the current user from the session cookie. If the access token has
// expired, transparently refreshes it (and re-sets cookies). Distinguishes a
// definitive auth failure (clear cookies → 401) from a transient Logto outage
// (preserve cookies → 503) so a blip doesn't log everyone out.
export async function GET(request: NextRequest): Promise<Response> {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!accessToken && !refreshToken) {
    return NextResponse.json({ user: null }, { status: 401, headers: NO_STORE });
  }

  const unauthorized = (): Response => {
    const response = NextResponse.json(
      { user: null },
      { status: 401, headers: NO_STORE },
    );
    clearTokenCookies(response);
    return response;
  };

  try {
    const config = getLogtoConfig();

    // null = token expired/invalid (401/403); throws on transient errors.
    let info = accessToken ? await fetchUserInfo(config, accessToken) : null;
    let refreshed: Awaited<ReturnType<typeof refreshAccessToken>> | null = null;

    if (!info && refreshToken) {
      refreshed = await refreshAccessToken(config, refreshToken);
      info = await fetchUserInfo(config, refreshed.access_token);
    }

    if (!info) return unauthorized();

    const response = NextResponse.json(
      { user: mapUserInfoToAuthUser(info) },
      { status: 200, headers: NO_STORE },
    );
    if (refreshed) setTokenCookies(response, refreshed);
    return response;
  } catch (e) {
    const status = (e as { status?: number })?.status;
    // Definitive auth failure (e.g. refresh token revoked/expired) → log out.
    if (status === 400 || status === 401 || status === 403) {
      return unauthorized();
    }
    // Transient (5xx, network, timeout): keep the session, signal retry. The
    // cookies are preserved so a recovered Logto restores the session.
    console.error("[/api/auth/me] transient session check failure", e);
    return NextResponse.json(
      { user: null },
      { status: 503, headers: NO_STORE },
    );
  }
}

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
import { handleApiError } from "@utils/api-error-handler";

// Returns the current user from the session cookie. If the access token has
// expired, transparently refreshes it (and re-sets cookies) before failing.
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

    if (!accessToken && !refreshToken) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const config = getLogtoConfig();

    let info = accessToken ? await fetchUserInfo(config, accessToken) : null;
    let refreshed: Awaited<ReturnType<typeof refreshAccessToken>> | null = null;

    if (!info && refreshToken) {
      try {
        refreshed = await refreshAccessToken(config, refreshToken);
        info = await fetchUserInfo(config, refreshed.access_token);
      } catch {
        refreshed = null;
        info = null;
      }
    }

    if (!info) {
      const response = NextResponse.json({ user: null }, { status: 401 });
      clearTokenCookies(response);
      return response;
    }

    const response = NextResponse.json(
      { user: mapUserInfoToAuthUser(info) },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
    if (refreshed) setTokenCookies(response, refreshed);
    return response;
  } catch (e) {
    return handleApiError(e, "/api/auth/me");
  }
}

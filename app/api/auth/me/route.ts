import { NextResponse, type NextRequest } from "next/server";
import { resolveSession } from "@lib/auth/session";
import {
  ACCESS_TOKEN_COOKIE,
  ID_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearTokenCookies,
  readTokenFromRequest,
  setTokenCookies,
} from "@utils/auth-cookies";

const NO_STORE = { "Cache-Control": "no-store" } as const;

// Returns the current user from the verified id_token cookie — no userinfo
// round-trip, so it works even when the access token is bound to a backend API
// resource (aud != userinfo). If the id_token has expired, transparently
// refreshes via the refresh token. Distinguishes a definitive auth failure
// (clear cookies → 401) from a transient Logto outage (preserve cookies → 503).
// The session-state decision tree lives in resolveSession (lib/auth/session.ts);
// this handler only maps its result to a Response and writes cookies.
export async function GET(request: NextRequest): Promise<Response> {
  const idToken = readTokenFromRequest(request, ID_TOKEN_COOKIE);
  const refreshToken = readTokenFromRequest(request, REFRESH_TOKEN_COOKIE);
  const accessToken = readTokenFromRequest(request, ACCESS_TOKEN_COOKIE);
  const hasRawCookie =
    request.cookies.has(ID_TOKEN_COOKIE) ||
    request.cookies.has(ACCESS_TOKEN_COOKIE) ||
    request.cookies.has(REFRESH_TOKEN_COOKIE);

  const resolution = await resolveSession({
    idToken,
    refreshToken,
    accessToken,
    hasRawCookie,
  });

  switch (resolution.kind) {
    case "ok": {
      const response = NextResponse.json(
        { user: resolution.user },
        { status: 200, headers: NO_STORE },
      );
      if (resolution.refreshedTokens) {
        setTokenCookies(response, resolution.refreshedTokens);
      }
      return response;
    }
    case "unauthorized": {
      const response = NextResponse.json(
        { user: null },
        { status: 401, headers: NO_STORE },
      );
      if (resolution.clearCookies) clearTokenCookies(response);
      return response;
    }
    case "transient":
      return NextResponse.json({ user: null }, { status: 503, headers: NO_STORE });
  }
}

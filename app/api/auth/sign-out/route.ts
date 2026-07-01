import { NextResponse, type NextRequest } from "next/server";
import {
  buildEndSessionUrl,
  getLogtoConfig,
  getRequestOrigin,
} from "@lib/auth/logto";
import {
  clearTokenCookies,
  ID_TOKEN_COOKIE,
  readTokenFromRequest,
} from "@utils/auth-cookies";

// Clears the local session cookies and ends the Logto session (RP-initiated
// logout), then returns the user to the site root.
export async function GET(request: NextRequest): Promise<Response> {
  const origin = getRequestOrigin(request);
  const idTokenHint =
    readTokenFromRequest(request, ID_TOKEN_COOKIE) ?? undefined;

  // Always clear the local session and redirect, even if building the Logto
  // end-session URL fails (e.g. misconfigured env) — never leave the user
  // unable to log out.
  let destination = `${origin}/`;
  try {
    destination = buildEndSessionUrl({
      config: getLogtoConfig(),
      idTokenHint,
      postLogoutRedirectUri: `${origin}/`,
    });
  } catch (e) {
    console.error("[/api/auth/sign-out] end-session URL build failed", e);
  }

  const response = NextResponse.redirect(destination);
  clearTokenCookies(response);
  return response;
}

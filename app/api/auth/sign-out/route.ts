import { NextResponse, type NextRequest } from "next/server";
import { buildEndSessionUrl, getLogtoConfig } from "@lib/auth/logto";
import { clearTokenCookies, ID_TOKEN_COOKIE } from "@utils/auth-cookies";
import { handleApiError } from "@utils/api-error-handler";

// Clears the local session cookies and ends the Logto session (RP-initiated
// logout), then returns the user to the site root.
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const config = getLogtoConfig();
    const origin = request.nextUrl.origin;
    const idTokenHint = request.cookies.get(ID_TOKEN_COOKIE)?.value;

    const endSessionUrl = buildEndSessionUrl({
      config,
      idTokenHint,
      postLogoutRedirectUri: `${origin}/`,
    });

    const response = NextResponse.redirect(endSessionUrl);
    clearTokenCookies(response);
    return response;
  } catch (e) {
    return handleApiError(e, "/api/auth/sign-out");
  }
}

import { NextResponse, type NextRequest } from "next/server";
import {
  buildAuthorizationUrl,
  generatePkce,
  getLogtoConfig,
  randomToken,
  sanitizeReturnTo,
} from "@lib/auth/logto";
import { setFlowCookies } from "@utils/auth-cookies";
import { handleApiError } from "@utils/api-error-handler";

// Starts the OIDC Authorization Code + PKCE flow: stash state/verifier/nonce in
// short-lived HttpOnly cookies, then redirect the browser to Logto's sign-in.
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const config = getLogtoConfig();
    // Derive from the actual request origin so localhost/preview/prod each work
    // without env juggling. Must byte-match the redirect_uri used at /callback.
    const redirectUri = `${request.nextUrl.origin}/api/auth/callback`;

    const returnTo =
      sanitizeReturnTo(request.nextUrl.searchParams.get("redirect")) ?? "/";
    const { codeVerifier, codeChallenge } = generatePkce();
    const state = randomToken();
    const nonce = randomToken();

    const authUrl = buildAuthorizationUrl({
      config,
      redirectUri,
      state,
      nonce,
      codeChallenge,
    });

    const response = NextResponse.redirect(authUrl);
    setFlowCookies(response, { state, codeVerifier, nonce, returnTo });
    return response;
  } catch (e) {
    return handleApiError(e, "/api/auth/sign-in");
  }
}

import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeAuthorizationCode,
  getLogtoConfig,
  sanitizeReturnTo,
  verifyIdToken,
} from "@lib/auth/logto";
import {
  clearFlowCookies,
  readFlowCookies,
  setTokenCookies,
} from "@utils/auth-cookies";

// Completes the OIDC flow: verify state, exchange the code for tokens, validate
// the id_token, store tokens in HttpOnly cookies, and return the user to where
// they started. On any failure, bounce to the login entry with an error flag.
export async function GET(request: NextRequest): Promise<Response> {
  const origin = request.nextUrl.origin;
  const params = request.nextUrl.searchParams;
  const flow = readFlowCookies(request);

  // Redirect failures home, not to /iniciar-sessio (which auto-restarts
  // sign-in and would loop, e.g. when the user cancelled).
  const fail = (reason: string): Response => {
    const response = NextResponse.redirect(`${origin}/?auth_error=${reason}`);
    clearFlowCookies(response);
    return response;
  };

  // Logto returned an error (user denied, etc.)
  if (params.get("error")) return fail("denied");

  const code = params.get("code");
  const state = params.get("state");
  if (
    !code ||
    !state ||
    !flow.state ||
    state !== flow.state ||
    !flow.codeVerifier ||
    !flow.nonce
  ) {
    return fail("state");
  }

  try {
    const config = getLogtoConfig();
    const tokens = await exchangeAuthorizationCode({
      config,
      code,
      codeVerifier: flow.codeVerifier,
      redirectUri: `${origin}/api/auth/callback`,
    });
    // The authorization_code grant always returns an id_token (openid scope).
    if (!tokens.id_token) throw new Error("Missing id_token in token response");
    await verifyIdToken(config, tokens.id_token, flow.nonce);

    const returnTo = sanitizeReturnTo(flow.returnTo) ?? "/";
    const response = NextResponse.redirect(`${origin}${returnTo}`);
    setTokenCookies(response, tokens);
    clearFlowCookies(response);
    return response;
  } catch (e) {
    console.error("[/api/auth/callback] token exchange failed", e);
    return fail("exchange");
  }
}

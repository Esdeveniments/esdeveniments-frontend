import { NextResponse, type NextRequest } from "next/server";
import {
  buildAuthorizationUrl,
  generatePkce,
  getLogtoConfig,
  getRequestOrigin,
  randomToken,
  sanitizeReturnTo,
} from "@lib/auth/logto";
import { setFlowCookies } from "@utils/auth-cookies";
import { handleApiError } from "@utils/api-error-handler";

// Starts the OIDC Authorization Code + PKCE flow: stash state/verifier/nonce in
// short-lived HttpOnly cookies, then redirect the browser to Logto's sign-in.
export async function GET(request: NextRequest): Promise<Response> {
  // ponytail: temporary proxy-origin diagnostic — remove once the preview
  // confirms the resolved origin. Echoes which headers the container sees.
  if (request.nextUrl.searchParams.get("debug") === "origins") {
    return NextResponse.json({
      xForwardedHost: request.headers.get("x-forwarded-host"),
      xForwardedProto: request.headers.get("x-forwarded-proto"),
      host: request.headers.get("host"),
      nextUrlOrigin: request.nextUrl.origin,
      resolved: getRequestOrigin(request),
    });
  }
  try {
    const config = getLogtoConfig();
    // Proxy-aware origin so localhost/preview/prod each work without env
    // juggling. Must byte-match the redirect_uri used at /callback.
    const redirectUri = `${getRequestOrigin(request)}/api/auth/callback`;

    const returnTo =
      sanitizeReturnTo(request.nextUrl.searchParams.get("redirect")) ?? "/";
    // Only forward a locale of the form "xx" to ui_locales (no header smuggling).
    const localeParam = request.nextUrl.searchParams.get("locale");
    const locale = localeParam && /^[a-z]{2}$/.test(localeParam) ? localeParam : undefined;
    const { codeVerifier, codeChallenge } = generatePkce();
    const state = randomToken();
    const nonce = randomToken();

    const authUrl = buildAuthorizationUrl({
      config,
      redirectUri,
      state,
      nonce,
      codeChallenge,
      locale,
    });

    const response = NextResponse.redirect(authUrl);
    setFlowCookies(response, { state, codeVerifier, nonce, returnTo });
    return response;
  } catch (e) {
    return handleApiError(e, "/api/auth/sign-in");
  }
}

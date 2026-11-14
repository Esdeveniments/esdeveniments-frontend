import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeAuthorizationCode,
  getLogtoConfig,
  getRequestOrigin,
  sanitizeReturnTo,
  verifyIdToken,
} from "@lib/auth/logto";
import {
  clearFlowCookies,
  readFlowCookies,
  setTokenCookies,
} from "@utils/auth-cookies";
import { getAuthenticatedUserExternal } from "@lib/api/users-external";
import { stripLocalePrefix } from "@utils/i18n-routing";
import { withLocalePath } from "@utils/i18n-seo";
import { DEFAULT_LOCALE } from "types/i18n";

const ONBOARDING_PATH = "/perfil/edita";

/**
 * Where the browser lands after sign-in. An account that hasn't finished
 * onboarding (backend `profileCompleted: false`, a new sign-up or an
 * abandoned onboarding) goes to the profile form first, which sends it on to
 * `returnTo` after saving. The form's router adds the locale itself, so the
 * `redirect` param carries the path without it. If the backend can't answer,
 * the session is still valid: skip onboarding rather than block the login.
 */
async function landingPath(returnTo: string, origin: string, accessToken: string): Promise<string> {
  const target = new URL(returnTo, origin);
  const { locale, pathnameWithoutLocale } = stripLocalePrefix(target.pathname);
  if (pathnameWithoutLocale === ONBOARDING_PATH) return returnTo;
  try {
    const user = await getAuthenticatedUserExternal(accessToken);
    if (user?.profileCompleted !== false) return returnTo;
  } catch (error) {
    console.warn("[/api/auth/callback] profile check failed; skipping onboarding", error);
    return returnTo;
  }
  const redirect = encodeURIComponent(`${pathnameWithoutLocale}${target.search}`);
  return `${withLocalePath(ONBOARDING_PATH, locale ?? DEFAULT_LOCALE)}?redirect=${redirect}`;
}

// Completes the OIDC flow: verify state, exchange the code for tokens, validate
// the id_token, store tokens in HttpOnly cookies, and return the user to where
// they started (through onboarding while the profile is incomplete). On any
// failure, bounce home with an error flag.
export async function GET(request: NextRequest): Promise<Response> {
  const origin = getRequestOrigin(request);
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
    // One-shot marker so AuthEventTracker can fire `auth_success` once the
    // browser lands back in the app — mirrors the `auth_error` marker `fail()`
    // already sets below on failure.
    const landingUrl = new URL(
      await landingPath(returnTo, origin, tokens.access_token),
      origin,
    );
    landingUrl.searchParams.set("auth_success", "1");
    const response = NextResponse.redirect(landingUrl);
    setTokenCookies(response, tokens);
    clearFlowCookies(response);
    return response;
  } catch (e) {
    console.error("[/api/auth/callback] token exchange failed", e);
    return fail("exchange");
  }
}

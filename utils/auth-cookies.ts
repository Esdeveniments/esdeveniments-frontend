// HttpOnly cookie storage for the Logto OIDC session. Tokens never reach
// client JS. The access token keeps the `auth_token` cookie name so existing
// consumers (favorites, events, preferits) read the session unchanged via
// getAccessTokenFromCookies().
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import type { FlowState, LogtoTokenResponse } from "types/auth";

export const ACCESS_TOKEN_COOKIE = "auth_token";
export const REFRESH_TOKEN_COOKIE = "auth_refresh_token";
export const ID_TOKEN_COOKIE = "logto_id_token";

export const STATE_COOKIE = "logto_state";
export const CODE_VERIFIER_COOKIE = "logto_code_verifier";
export const NONCE_COOKIE = "logto_nonce";
export const RETURN_TO_COOKIE = "logto_return_to";

// Refresh token / id_token outlive the access token; cap session length here.
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const FLOW_MAX_AGE = 60 * 10; // 10 minutes

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const baseOptions = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  // Lax so cookies are sent on Logto's top-level GET redirect back to /callback.
  sameSite: "lax" as const,
};

/** Read access token from incoming request cookies (server components + routes). */
export async function getAccessTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

export function setTokenCookies(
  response: NextResponse,
  tokens: LogtoTokenResponse,
): void {
  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.access_token, {
    ...baseOptions,
    path: "/",
    maxAge: tokens.expires_in,
  });
  // Refresh-token responses may omit id_token; keep the existing one rather
  // than overwriting it (the id_token_hint is needed for RP-initiated logout).
  if (tokens.id_token) {
    response.cookies.set(ID_TOKEN_COOKIE, tokens.id_token, {
      ...baseOptions,
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
  }
  if (tokens.refresh_token) {
    response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refresh_token, {
      ...baseOptions,
      path: "/api/auth",
      maxAge: SESSION_MAX_AGE,
    });
  }
}

export function clearTokenCookies(response: NextResponse): void {
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", {
    ...baseOptions,
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(ID_TOKEN_COOKIE, "", {
    ...baseOptions,
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", {
    ...baseOptions,
    path: "/api/auth",
    maxAge: 0,
  });
}

export function setFlowCookies(response: NextResponse, flow: FlowState): void {
  const opts = { ...baseOptions, path: "/api/auth", maxAge: FLOW_MAX_AGE };
  response.cookies.set(STATE_COOKIE, flow.state, opts);
  response.cookies.set(CODE_VERIFIER_COOKIE, flow.codeVerifier, opts);
  response.cookies.set(NONCE_COOKIE, flow.nonce, opts);
  response.cookies.set(RETURN_TO_COOKIE, flow.returnTo, opts);
}

export function clearFlowCookies(response: NextResponse): void {
  const opts = { ...baseOptions, path: "/api/auth", maxAge: 0 };
  for (const name of [
    STATE_COOKIE,
    CODE_VERIFIER_COOKIE,
    NONCE_COOKIE,
    RETURN_TO_COOKIE,
  ]) {
    response.cookies.set(name, "", opts);
  }
}

export function readFlowCookies(request: NextRequest): Partial<FlowState> {
  return {
    state: request.cookies.get(STATE_COOKIE)?.value,
    codeVerifier: request.cookies.get(CODE_VERIFIER_COOKIE)?.value,
    nonce: request.cookies.get(NONCE_COOKIE)?.value,
    returnTo: request.cookies.get(RETURN_TO_COOKIE)?.value,
  };
}

// HttpOnly cookie storage for the Logto OIDC flow. Tokens never reach client
// JS. Set on NextResponse so the redirect flow works without the async
// cookies() store; read from NextRequest.
import type { NextRequest, NextResponse } from "next/server";
import type { FlowState, LogtoTokenResponse } from "types/auth";

export const ACCESS_TOKEN_COOKIE = "logto_access_token";
export const REFRESH_TOKEN_COOKIE = "logto_refresh_token";
export const ID_TOKEN_COOKIE = "logto_id_token";

export const STATE_COOKIE = "logto_state";
export const CODE_VERIFIER_COOKIE = "logto_code_verifier";
export const NONCE_COOKIE = "logto_nonce";
export const RETURN_TO_COOKIE = "logto_return_to";

// Refresh tokens / id_token outlive the access token; cap session length here.
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const FLOW_MAX_AGE = 60 * 10; // 10 minutes

const isProd = process.env.NODE_ENV === "production";

const baseOptions = {
  httpOnly: true,
  secure: isProd,
  // Lax so cookies are sent on Logto's top-level GET redirect back to /callback.
  sameSite: "lax" as const,
};

export function setTokenCookies(
  response: NextResponse,
  tokens: LogtoTokenResponse,
): void {
  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.access_token, {
    ...baseOptions,
    path: "/",
    maxAge: tokens.expires_in,
  });
  response.cookies.set(ID_TOKEN_COOKIE, tokens.id_token, {
    ...baseOptions,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  if (tokens.refresh_token) {
    response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refresh_token, {
      ...baseOptions,
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
  }
}

export function clearTokenCookies(response: NextResponse): void {
  for (const name of [
    ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN_COOKIE,
    ID_TOKEN_COOKIE,
  ]) {
    response.cookies.set(name, "", { ...baseOptions, path: "/", maxAge: 0 });
  }
}

export function setFlowCookies(
  response: NextResponse,
  flow: FlowState,
): void {
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

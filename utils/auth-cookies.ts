import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { parseBackendDateAsUtcMs } from "@utils/date-helpers";

export const AUTH_TOKEN_COOKIE = "auth_token";
export const REFRESH_TOKEN_COOKIE = "auth_refresh_token";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Access token: 1h default, sent with all same-origin requests
const ACCESS_TOKEN_MAX_AGE = 60 * 60;

// Refresh token: 30 days, scoped to /api/auth paths only
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Set auth cookies on a NextResponse.
 * Access token is available to all /api routes; refresh token is scoped to /api/auth.
 */
export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  expiresAt: string,
  refreshToken?: string
): void {
  const expiry = parseBackendDateAsUtcMs(expiresAt);
  const maxAge = expiry === null
    ? ACCESS_TOKEN_MAX_AGE
    : Math.max(0, Math.floor((expiry - Date.now()) / 1000));

  response.cookies.set(AUTH_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  if (refreshToken) {
    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: "lax",
      path: "/api/auth",
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
  }
}

/** Clear auth cookies on a NextResponse. */
export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(AUTH_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set(REFRESH_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 0,
  });
}

/** Read access token from incoming request cookies (server-side only). */
export async function getAccessTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_TOKEN_COOKIE)?.value ?? null;
}

/** Read refresh token from incoming request cookies (server-side only). */
export async function getRefreshTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null;
}

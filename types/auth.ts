import type { PictureSource } from "./api/user";

export type AuthRole = "USER" | "ADMIN" | "ORGANIZATION";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  username: string;
  avatarUrl?: string;
  role?: AuthRole;
  emailVerified?: boolean;
  // Backend-owned fields (GET /api/auth/me) — absent until enrichment succeeds.
  pictureSource?: PictureSource;
  lastLoginAt?: string;
  /**
   * True once username + displayName are set. `POST /api/events` 403s while
   * this is false — `/publica` gates on it to send the user to complete
   * their profile before they fill out the whole event form.
   */
  profileCompleted?: boolean;
  /**
   * Not derivable from the public `GET /api/users/{username}` endpoint (it
   * 404s for incomplete/temporary profiles — the exact case the edit-profile
   * page needs to prefill), so it's carried on the session user instead.
   */
  bio?: string;
  // Original Logto subject identifier, preserved for debugging/auditing.
  logtoId?: string;
  /**
   * Set when the id_token session is valid but the backend enrichment call
   * (GET /api/auth/me with `Authorization: Bearer <access_token>`) was
   * rejected — i.e. `4xx` (typically `401` because the audience or JWKS
   * wiring is wrong). Surfaced in the navbar dropdown so users can tell
   * apart "logged out" from "logged in but the backend doesn't accept me".
   * Transient failures (5xx / network blip) are intentionally not flagged —
   * returning the id_token-only user without this property keeps the session
   * visually stable during a brief outage.
   */
  profileEnrichmentFailed?: "auth";
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type { LogtoTokenResponse, LogtoUserInfo, LogtoIdTokenClaims, IdTokenPayload, Jwk } from "./api/auth";

/** Resolved Logto OIDC endpoints + client credentials. */
export interface LogtoConfig {
  endpoint: string;
  issuer: string;
  appId: string;
  appSecret: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string;
  endSessionEndpoint: string;
  scope: string;
  // Optional API resource indicator. When set, Logto issues a JWT access token
  // with aud=<resource> that a backend can validate (otherwise the token is
  // userinfo-scoped only).
  apiResource?: string;
}

/** PKCE verifier/challenge pair (RFC 7636, S256). */
export interface Pkce {
  codeVerifier: string;
  codeChallenge: string;
}

/** Short-lived per-request state carried through the OIDC redirect, in cookies. */
export interface FlowState {
  state: string;
  codeVerifier: string;
  nonce: string;
  returnTo: string;
}

/**
 * A single Set-Cookie write. Shared by setTokenCookies (route handlers
 * holding a NextResponse) and getValidAccessToken (Server Actions / route
 * handlers that only have the cookies() API), both in utils/auth-cookies.ts,
 * so the two write paths can't drift on maxAge/path/encryption.
 */
export interface TokenCookieWrite {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax";
    path: string;
    maxAge: number;
  };
}

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Redirect the browser to start the Logto sign-in flow. */
  signIn(redirectTo?: string): void;
  /** Redirect the browser to clear the session and end the Logto session. */
  logout(): void;
  /**
   * Re-fetches `/api/auth/me` and replaces `user` with the result. Call this
   * after a successful profile/avatar mutation — the client session is
   * hydrated once on mount and nothing else keeps it in sync, so without an
   * explicit refetch, `profileCompleted`/`username`/`avatarUrl` stay stale
   * until a full page reload.
   */
  refetchUser(): Promise<void>;
}

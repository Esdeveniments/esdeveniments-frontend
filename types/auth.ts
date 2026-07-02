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

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Redirect the browser to start the Logto sign-in flow. */
  signIn(redirectTo?: string): void;
  /** Redirect the browser to clear the session and end the Logto session. */
  logout(): void;
}

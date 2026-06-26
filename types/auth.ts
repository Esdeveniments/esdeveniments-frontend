export type AuthRole = "USER" | "ADMIN" | "ORGANIZATION";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  username: string;
  avatarUrl?: string;
  role?: AuthRole;
  emailVerified?: boolean;
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type { LogtoTokenResponse, LogtoUserInfo, LogtoIdTokenClaims } from "./api/auth";

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

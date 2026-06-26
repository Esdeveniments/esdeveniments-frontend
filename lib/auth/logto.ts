// Server-only Logto OIDC client. We integrate via the standard OAuth 2.0 /
// OpenID Connect endpoints directly (no @logto/* SDK) to keep the client
// bundle untouched. Endpoints are fixed for Logto, so no network discovery.
import { createHash, randomBytes } from "node:crypto";
import type {
  AuthRole,
  AuthUser,
  LogtoConfig,
  LogtoIdTokenClaims,
  LogtoTokenResponse,
  LogtoUserInfo,
  Pkce,
} from "types/auth";

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Build the Logto OIDC config from env. Reads at call time (inside request
 * handlers) so a missing var doesn't crash the build, only the auth routes.
 */
export function getLogtoConfig(): LogtoConfig {
  const endpoint = requireEnv("LOGTO_ENDPOINT").replace(/\/+$/, "");
  const issuer = `${endpoint}/oidc`;
  return {
    endpoint,
    issuer,
    appId: requireEnv("LOGTO_APP_ID"),
    appSecret: requireEnv("LOGTO_APP_SECRET"),
    authorizationEndpoint: `${issuer}/auth`,
    tokenEndpoint: `${issuer}/token`,
    userinfoEndpoint: `${issuer}/me`,
    endSessionEndpoint: `${issuer}/session/end`,
    // offline_access → refresh token; custom_data/roles → profile mapping.
    scope: "openid profile email offline_access custom_data roles",
  };
}

/** RFC 7636 PKCE pair using SHA-256 (S256). */
export function generatePkce(): Pkce {
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return { codeVerifier, codeChallenge };
}

export function randomToken(): string {
  return randomBytes(16).toString("base64url");
}

/**
 * Only allow safe relative paths to prevent open-redirect attacks. Rejects
 * protocol-relative (`//`), backslash tricks (`/\`) that browsers normalize to
 * `//`, control characters, and percent-encoded leading slashes (`/%2f`) that
 * decode to `//`.
 */
export function sanitizeReturnTo(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//") || value.startsWith("/\\")) return null;
  if (value.includes("\\")) return null;
  if (/^\/%2[fF]/.test(value)) return null;
  // Reject control characters (newlines, etc.) in the path.
  for (let i = 0; i < value.length; i++) {
    if (value.charCodeAt(i) < 0x20) return null;
  }
  return value;
}

export function buildAuthorizationUrl(params: {
  config: LogtoConfig;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
}): string {
  const { config, redirectUri, state, nonce, codeChallenge } = params;
  const url = new URL(config.authorizationEndpoint);
  url.search = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: config.scope,
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

async function postToken(
  config: LogtoConfig,
  body: Record<string, string>,
): Promise<LogtoTokenResponse> {
  const res = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    // client_secret_post: credentials in the body (back-channel, over TLS).
    body: new URLSearchParams({
      ...body,
      client_id: config.appId,
      client_secret: config.appSecret,
    }).toString(),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Logto token endpoint ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as LogtoTokenResponse;
}

export function exchangeAuthorizationCode(params: {
  config: LogtoConfig;
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<LogtoTokenResponse> {
  const { config, code, codeVerifier, redirectUri } = params;
  return postToken(config, {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });
}

export function refreshAccessToken(
  config: LogtoConfig,
  refreshToken: string,
): Promise<LogtoTokenResponse> {
  return postToken(config, {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

/** Fetch userinfo. Returns null on a non-OK response (e.g. expired token). */
export async function fetchUserInfo(
  config: LogtoConfig,
  accessToken: string,
): Promise<LogtoUserInfo | null> {
  const res = await fetch(config.userinfoEndpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  return (await res.json()) as LogtoUserInfo;
}

export function buildEndSessionUrl(params: {
  config: LogtoConfig;
  idTokenHint?: string;
  postLogoutRedirectUri: string;
}): string {
  const { config, idTokenHint, postLogoutRedirectUri } = params;
  const url = new URL(config.endSessionEndpoint);
  const search = new URLSearchParams({
    post_logout_redirect_uri: postLogoutRedirectUri,
  });
  if (idTokenHint) search.set("id_token_hint", idTokenHint);
  url.search = search.toString();
  return url.toString();
}

function decodeJwtPayload(jwt: string): LogtoIdTokenClaims {
  const part = jwt.split(".")[1];
  if (!part) throw new Error("Malformed id_token");
  return JSON.parse(
    Buffer.from(part, "base64url").toString("utf8"),
  ) as LogtoIdTokenClaims;
}

/**
 * Validate id_token claims. The token arrives over a direct back-channel TLS
 * call to the token endpoint (Authorization Code flow), so per OIDC Core
 * 3.1.3.7 the TLS connection authenticates the issuer and signature
 * verification can be skipped. We still validate iss/aud/exp/nonce.
 */
export function validateIdTokenClaims(
  config: LogtoConfig,
  idToken: string,
  expectedNonce: string,
): LogtoIdTokenClaims {
  const claims = decodeJwtPayload(idToken);
  if (claims.iss !== config.issuer) {
    throw new Error("id_token issuer mismatch");
  }
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(config.appId)) {
    throw new Error("id_token audience mismatch");
  }
  if (typeof claims.exp !== "number" || claims.exp * 1000 <= Date.now()) {
    throw new Error("id_token expired");
  }
  if (claims.nonce !== expectedNonce) {
    throw new Error("id_token nonce mismatch");
  }
  return claims;
}

function mapRole(roles: string[] | undefined): AuthRole | undefined {
  if (!roles?.length) return undefined;
  const lower = roles.map((r) => r.toLowerCase());
  if (lower.includes("admin")) return "ADMIN";
  if (lower.includes("organization")) return "ORGANIZATION";
  return "USER";
}

export function mapUserInfoToAuthUser(info: LogtoUserInfo): AuthUser {
  return {
    id: info.sub,
    email: info.email ?? "",
    name: info.name ?? info.username ?? "",
    username: info.username ?? "",
    avatarUrl: info.picture ?? undefined,
    role: mapRole(info.roles),
    emailVerified: info.email_verified,
  };
}

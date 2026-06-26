// Server-only Logto OIDC client. We integrate via the standard OAuth 2.0 /
// OpenID Connect endpoints directly (no @logto/* SDK) to keep the client
// bundle untouched. Endpoints are fixed for Logto, so no network discovery.
import {
  createHash,
  createPublicKey,
  randomBytes,
  verify as cryptoVerify,
} from "node:crypto";
import type {
  AuthRole,
  AuthUser,
  Jwk,
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
  // Tokens and the client_secret travel to this endpoint — require HTTPS so a
  // misconfigured http:// URL can't leak them. Allow http for local dev only.
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(endpoint);
  if (!endpoint.startsWith("https://") && !isLocal) {
    throw new Error("LOGTO_ENDPOINT must use https://");
  }
  const issuer = `${endpoint}/oidc`;
  // offline_access → refresh token; custom_data/roles → profile mapping.
  const baseScope = "openid profile email offline_access custom_data roles";
  const apiResource = process.env.LOGTO_API_RESOURCE?.trim() || undefined;
  // When targeting a backend API resource, request its scopes too so the
  // issued JWT carries them. Space-separated, e.g. "read:events write:favorites".
  const apiScopes = apiResource
    ? process.env.LOGTO_API_SCOPES?.trim()
    : undefined;
  return {
    endpoint,
    issuer,
    appId: requireEnv("LOGTO_APP_ID"),
    appSecret: requireEnv("LOGTO_APP_SECRET"),
    authorizationEndpoint: `${issuer}/auth`,
    tokenEndpoint: `${issuer}/token`,
    userinfoEndpoint: `${issuer}/me`,
    endSessionEndpoint: `${issuer}/session/end`,
    scope: apiScopes ? `${baseScope} ${apiScopes}` : baseScope,
    apiResource,
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

// Shared open-redirect-safe path check (crypto-free so middleware can use it).
export { sanitizeReturnTo } from "@utils/redirect-safety";

export function buildAuthorizationUrl(params: {
  config: LogtoConfig;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
  locale?: string;
}): string {
  const { config, redirectUri, state, nonce, codeChallenge, locale } = params;
  const url = new URL(config.authorizationEndpoint);
  const search = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: config.scope,
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  // Request a JWT access token for the backend API resource when configured.
  if (config.apiResource) search.set("resource", config.apiResource);
  // Render Logto's hosted sign-in page in the user's language.
  if (locale) search.set("ui_locales", locale);
  url.search = search.toString();
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
      // Bind the issued access token to the API resource when configured.
      ...(config.apiResource ? { resource: config.apiResource } : {}),
    }).toString(),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // Attach the status so callers can tell a definitive auth failure
    // (400 invalid_grant) from a transient outage (5xx) and avoid logging the
    // user out on the latter.
    throw Object.assign(
      new Error(`Logto token endpoint ${res.status}: ${text.slice(0, 200)}`),
      { status: res.status },
    );
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

/**
 * Fetch userinfo. Returns null only on a definitive auth failure (401/403, i.e.
 * the access token is expired/invalid). Throws with a `status` on transient
 * errors (5xx, network) so callers don't treat a Logto outage as a logout.
 */
export async function fetchUserInfo(
  config: LogtoConfig,
  accessToken: string,
): Promise<LogtoUserInfo | null> {
  const res = await fetch(config.userinfoEndpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) {
    throw Object.assign(new Error(`Logto userinfo ${res.status}`), {
      status: res.status,
    });
  }
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

// Cache the issuer's JWKS briefly; refetch on a kid miss to handle rotation.
let jwksCache: { keys: Jwk[]; fetchedAt: number } | null = null;
const JWKS_TTL_MS = 10 * 60 * 1000;

async function getJwks(config: LogtoConfig, force = false): Promise<Jwk[]> {
  if (jwksCache && !force && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS) {
    return jwksCache.keys;
  }
  const res = await fetch(`${config.issuer}/jwks`, {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Logto JWKS ${res.status}`);
  const data = (await res.json()) as { keys: Jwk[] };
  jwksCache = { keys: data.keys ?? [], fetchedAt: Date.now() };
  return jwksCache.keys;
}

/**
 * Verify the id_token's RS256 signature against the issuer's JWKS. Defense in
 * depth on top of the back-channel TLS to the token endpoint: a forged/replaced
 * token response can't impersonate a user without the issuer's private key.
 */
export async function verifyIdToken(
  config: LogtoConfig,
  idToken: string,
  expectedNonce: string,
): Promise<LogtoIdTokenClaims> {
  const [headerB64, payloadB64, signatureB64] = idToken.split(".");
  if (!headerB64 || !payloadB64 || !signatureB64) {
    throw new Error("Malformed id_token");
  }
  const header = JSON.parse(
    Buffer.from(headerB64, "base64url").toString("utf8"),
  ) as { alg?: string; kid?: string };
  if (header.alg !== "RS256") {
    throw new Error(`Unsupported id_token alg: ${header.alg}`);
  }

  const findKey = (keys: Jwk[]) =>
    keys.find((k) => k.kty === "RSA" && (!header.kid || k.kid === header.kid));
  let jwk = findKey(await getJwks(config));
  if (!jwk) jwk = findKey(await getJwks(config, true)); // refetch on rotation
  if (!jwk) throw new Error("No matching JWKS key for id_token");

  const publicKey = createPublicKey({ key: jwk, format: "jwk" });
  const ok = cryptoVerify(
    "RSA-SHA256",
    Buffer.from(`${headerB64}.${payloadB64}`),
    publicKey,
    Buffer.from(signatureB64, "base64url"),
  );
  if (!ok) throw new Error("id_token signature verification failed");

  return validateIdTokenClaims(config, idToken, expectedNonce);
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
  // With multiple audiences, OIDC requires azp to identify the intended client.
  if (aud.length > 1 && claims.azp !== config.appId) {
    throw new Error("id_token azp mismatch");
  }
  // Allow a small clock-skew tolerance for minor IdP/server clock drift.
  const CLOCK_SKEW_MS = 60_000;
  if (
    typeof claims.exp !== "number" ||
    claims.exp * 1000 + CLOCK_SKEW_MS <= Date.now()
  ) {
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

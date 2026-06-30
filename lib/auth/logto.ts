// Server-only Logto OIDC client. We integrate via the standard OAuth 2.0 /
// OpenID Connect endpoints directly (no @logto/* SDK) to keep the client
// bundle untouched. Endpoints are fixed for Logto, so no network discovery.
import "server-only";
import {
  createHash,
  createPublicKey,
  randomBytes,
  verify as cryptoVerify,
} from "node:crypto";
import type { NextRequest } from "next/server";
import type {
  AuthRole,
  AuthUser,
  IdTokenPayload,
  Jwk,
  LogtoConfig,
  LogtoTokenResponse,
  LogtoUserInfo,
  Pkce,
} from "types/auth";

/**
 * Public origin of the request, honoring the reverse proxy. Behind Coolify /
 * Traefik, request.nextUrl.origin in a route handler is the container's
 * internal bind (https://0.0.0.0:3000), so derive the host from the proxy
 * headers — x-forwarded-host first, then the preserved Host header — and only
 * fall back to nextUrl.origin when those are absent or also internal. Used to
 * build the OIDC redirect_uri + post-logout URI; Logto's exact-match redirect
 * allowlist is what makes trusting the forwarded host safe.
 */
export function getRequestOrigin(request: NextRequest): string {
  const first = (h: string | null) => h?.split(",")[0].trim() || "";
  const isInternal = (h: string) =>
    !h ||
    h.startsWith("0.0.0.0") ||
    h.startsWith("localhost") ||
    h.startsWith("127.0.0.1");
  const host =
    first(request.headers.get("x-forwarded-host")) ||
    first(request.headers.get("host"));
  if (!isInternal(host)) {
    const proto = first(request.headers.get("x-forwarded-proto")) || "https";
    return `${proto}://${host}`;
  }
  return request.nextUrl.origin;
}

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
  // Tokens and the client_secret travel to this endpoint — require HTTPS in
  // production so a misconfigured http:// URL can't leak them. Allow http in
  // non-production for local/LAN/cross-device testing.
  if (
    !endpoint.startsWith("https://") &&
    process.env.NODE_ENV === "production"
  ) {
    throw new Error("LOGTO_ENDPOINT must use https:// in production");
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

function decodeJwtPayload(jwt: string): IdTokenPayload {
  const part = jwt.split(".")[1];
  if (!part) throw new Error("Malformed id_token");
  return JSON.parse(
    Buffer.from(part, "base64url").toString("utf8"),
  ) as IdTokenPayload;
}

// Cache each issuer's JWKS briefly; refetch on a kid miss to handle rotation.
// Keyed by issuer so multiple Logto configs in one process don't cross keys.
const jwksCache = new Map<string, { keys: Jwk[]; fetchedAt: number }>();
const JWKS_TTL_MS = 10 * 60 * 1000;

async function getJwks(config: LogtoConfig, force = false): Promise<Jwk[]> {
  const cached = jwksCache.get(config.issuer);
  if (cached && !force && Date.now() - cached.fetchedAt < JWKS_TTL_MS) {
    return cached.keys;
  }
  let res: Response;
  try {
    res = await fetch(`${config.issuer}/jwks`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    // Network/timeout — transient, never cache.
    throw Object.assign(new Error("Logto JWKS fetch failed"), {
      transient: true,
    });
  }
  if (!res.ok) {
    throw Object.assign(new Error(`Logto JWKS ${res.status}`), {
      transient: res.status >= 500 || res.status === 429,
    });
  }
  const data = (await res.json().catch(() => null)) as
    | { keys?: Jwk[]; error?: string }
    | null;
  // A 200 can still carry a null/non-object body, an error body, or a malformed
  // payload — don't read .error off null, and never cache any of these.
  if (!data || typeof data !== "object" || data.error || !Array.isArray(data.keys)) {
    throw Object.assign(
      new Error(`Logto JWKS malformed: ${data?.error ?? "no keys array"}`),
      { transient: true },
    );
  }
  jwksCache.set(config.issuer, { keys: data.keys, fetchedAt: Date.now() });
  return data.keys;
}

// Supported JWS algs → the Node digest and the JWK key type they need. Logto
// self-hosted signs with ES384 by default; RSA algs are kept for portability.
const SIGNING_ALGS: Record<
  string,
  { hash: string; kty: "EC" | "RSA"; ecdsa: boolean }
> = {
  ES256: { hash: "SHA256", kty: "EC", ecdsa: true },
  ES384: { hash: "SHA384", kty: "EC", ecdsa: true },
  ES512: { hash: "SHA512", kty: "EC", ecdsa: true },
  RS256: { hash: "SHA256", kty: "RSA", ecdsa: false },
  RS384: { hash: "SHA384", kty: "RSA", ecdsa: false },
  RS512: { hash: "SHA512", kty: "RSA", ecdsa: false },
};

function hasKeyMaterial(k: Jwk, kty: "EC" | "RSA"): boolean {
  return kty === "EC"
    ? Boolean(k.x) && Boolean(k.y) && Boolean(k.crv)
    : Boolean(k.n) && Boolean(k.e);
}

/**
 * Verify the id_token signature against the issuer's JWKS (ES256/384/512 and
 * RS256/384/512). Defense in depth on top of the back-channel TLS to the token
 * endpoint: a forged/replaced token response can't impersonate a user without
 * the issuer's private key.
 */
/**
 * Callback path: verify signature + claims AND require the nonce to match the
 * flow nonce. Use this for the authorization_code callback.
 */
export function verifyIdToken(
  config: LogtoConfig,
  idToken: string,
  expectedNonce: string,
): Promise<IdTokenPayload> {
  return verifyIdTokenInternal(config, idToken, expectedNonce);
}

/**
 * Session path (/api/auth/me): verify a stored id_token's signature + claims
 * without a nonce (the flow nonce is long gone). Never use this at the callback.
 */
export function verifyStoredIdToken(
  config: LogtoConfig,
  idToken: string,
): Promise<IdTokenPayload> {
  return verifyIdTokenInternal(config, idToken, null);
}

async function verifyIdTokenInternal(
  config: LogtoConfig,
  idToken: string,
  expectedNonce: string | null,
): Promise<IdTokenPayload> {
  const [headerB64, payloadB64, signatureB64] = idToken.split(".");
  if (!headerB64 || !payloadB64 || !signatureB64) {
    throw new Error("Malformed id_token");
  }
  const header = JSON.parse(
    Buffer.from(headerB64, "base64url").toString("utf8"),
  ) as { alg?: string; kid?: string };
  const spec = header.alg ? SIGNING_ALGS[header.alg] : undefined;
  if (!spec) throw new Error(`Unsupported id_token alg: ${header.alg}`);

  const findKey = (keys: Jwk[]) =>
    keys.find(
      (k) =>
        k.kty === spec.kty &&
        hasKeyMaterial(k, spec.kty) &&
        (!header.kid || k.kid === header.kid),
    );
  let jwk = findKey(await getJwks(config));
  if (!jwk) jwk = findKey(await getJwks(config, true)); // refetch on rotation
  if (!jwk) throw new Error("No matching JWKS key for id_token");

  const publicKey = createPublicKey({ key: jwk, format: "jwk" });
  const ok = cryptoVerify(
    spec.hash,
    Buffer.from(`${headerB64}.${payloadB64}`),
    // JWS ECDSA signatures are raw r||s (IEEE P1363), not DER.
    spec.ecdsa ? { key: publicKey, dsaEncoding: "ieee-p1363" } : publicKey,
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
  // string → require this nonce; null → explicitly skip (the /me re-validation
  // path, where the flow nonce no longer exists).
  expectedNonce: string | null,
): IdTokenPayload {
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
  // Clock-skew tolerance for minor IdP/server clock drift.
  const SKEW_MS = 60_000;
  const now = Date.now();
  if (typeof claims.exp !== "number" || claims.exp * 1000 + SKEW_MS <= now) {
    throw new Error("id_token expired");
  }
  // Reject tokens not yet valid / issued in the future (when those claims exist).
  if (typeof claims.nbf === "number" && claims.nbf * 1000 - SKEW_MS > now) {
    throw new Error("id_token not yet valid (nbf)");
  }
  if (typeof claims.iat === "number" && claims.iat * 1000 - SKEW_MS > now) {
    throw new Error("id_token issued in the future (iat)");
  }
  if (expectedNonce !== null && claims.nonce !== expectedNonce) {
    throw new Error("id_token nonce mismatch");
  }
  return claims;
}

/** Build the session user from verified id_token claims (no userinfo call). */
export function mapClaimsToAuthUser(claims: IdTokenPayload): AuthUser {
  return mapUserInfoToAuthUser(claims);
}

function mapRole(roles: string[] | undefined): AuthRole | undefined {
  // roles comes from untrusted JSON — guard against a non-array value.
  if (!Array.isArray(roles) || roles.length === 0) return undefined;
  const lower = roles.map((r) => String(r).toLowerCase());
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

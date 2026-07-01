// HttpOnly cookie storage for the Logto OIDC session. Tokens never reach
// client JS. The access token keeps the `auth_token` cookie name so existing
// consumers (favorites, events, preferits) read the session unchanged via
// getAccessTokenFromCookies().
//
// When LOGTO_COOKIE_SECRET is set, the token cookie *values* are additionally
// encrypted at rest with AES-256-GCM (Logto's SDK default). It's optional and
// backwards-compatible: unset → plaintext; a legacy plaintext cookie is still
// readable after the secret is introduced (graceful rollout).
import "server-only";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
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

// ── At-rest encryption (optional) ─────────────────────────────
const ENC_PREFIX = "v1.";

// Resolve the AES key lazily on first cookie access (not at module load) so a
// missing/short secret fails the request, not the whole build/import — this
// module is imported app-wide. A >=32-char random secret keyed via SHA-256 to
// a 32-byte AES key is sufficient (no stretching of a server-side secret).
let encKeyCache: Buffer | null | undefined;
function getEncKey(): Buffer | null {
  if (encKeyCache !== undefined) return encKeyCache;
  const cookieSecret = process.env.LOGTO_COOKIE_SECRET;
  if (cookieSecret && cookieSecret.length < 32) {
    throw new Error("LOGTO_COOKIE_SECRET must be at least 32 characters");
  }
  if (!cookieSecret && IS_PRODUCTION) {
    console.warn(
      "[auth-cookies] LOGTO_COOKIE_SECRET is not set — session tokens are stored unencrypted",
    );
  }
  encKeyCache = cookieSecret
    ? createHash("sha256").update(cookieSecret).digest()
    : null;
  return encKeyCache;
}

function encrypt(plaintext: string): string {
  const encKey = getEncKey();
  if (!encKey) return plaintext;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encKey, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ENC_PREFIX + Buffer.concat([iv, tag, enc]).toString("base64url");
}

function decrypt(value: string | undefined): string | null {
  if (!value) return null;
  const encKey = getEncKey();
  if (!encKey) {
    // A v1.* envelope with no key configured means the secret was removed or
    // mistyped — don't pass the encrypted blob through as a bearer token.
    return value.startsWith(ENC_PREFIX) ? null : value;
  }
  // Legacy plaintext cookie written before the secret was introduced.
  if (!value.startsWith(ENC_PREFIX)) return value;
  try {
    const buf = Buffer.from(value.slice(ENC_PREFIX.length), "base64url");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const enc = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", encKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    return null;
  }
}

/** Read access token from incoming request cookies (server components + routes). */
export async function getAccessTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return decrypt(cookieStore.get(ACCESS_TOKEN_COOKIE)?.value);
}

/** Read and decrypt a token cookie from a route handler's NextRequest. */
export function readTokenFromRequest(
  request: NextRequest,
  name: string,
): string | null {
  return decrypt(request.cookies.get(name)?.value);
}

export function setTokenCookies(
  response: NextResponse,
  tokens: LogtoTokenResponse,
): void {
  response.cookies.set(ACCESS_TOKEN_COOKIE, encrypt(tokens.access_token), {
    ...baseOptions,
    path: "/",
    maxAge: tokens.expires_in,
  });
  // Refresh-token responses may omit id_token; keep the existing one rather
  // than overwriting it (the id_token_hint is needed for RP-initiated logout).
  if (tokens.id_token) {
    response.cookies.set(ID_TOKEN_COOKIE, encrypt(tokens.id_token), {
      ...baseOptions,
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
  }
  if (tokens.refresh_token) {
    response.cookies.set(REFRESH_TOKEN_COOKIE, encrypt(tokens.refresh_token), {
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

import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { execute, TURSO_TIMEOUT_MS } from "@lib/db/turso";
import { AUTH_SESSION_MAX_AGE, LOGTO_TOKEN_TIMEOUT_MS } from "@utils/constants";
import { LogtoTokenResponseSchema } from "@lib/validation/auth";
import { openToken, sealToken } from "./token-encryption";
import type { LogtoConfig, LogtoTokenResponse } from "types/auth";

const SCHEMA = `CREATE TABLE IF NOT EXISTS auth_refresh (
  token_key TEXT PRIMARY KEY, owner TEXT NOT NULL, result TEXT,
  result_until INTEGER, reusable INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL, claimed_at INTEGER
)`;
// After the claim commits, a live owner's claim reply, token request and result
// write each answer or abort within their timeouts. A claim with no result after
// this lease lost its process.
export const CLAIM_LEASE_SECONDS = (2 * TURSO_TIMEOUT_MS + LOGTO_TOKEN_TIMEOUT_MS) / 1000 + 5;
let schemaPromise: Promise<void> | null = null;

/**
 * Claim once in durable storage, then share an encrypted result across instances.
 * Never steal a claim that may be live: a timed-out process may already have
 * consumed the provider token. Redis is unsuitable here because our cache uses allkeys-lru.
 */
export async function coordinateRefresh(
  config: LogtoConfig,
  refreshToken: string,
  exchange: () => Promise<LogtoTokenResponse>,
): Promise<LogtoTokenResponse> {
  if (!schemaPromise) {
    schemaPromise = execute(SCHEMA)
      .then(() => execute("ALTER TABLE auth_refresh ADD COLUMN claimed_at INTEGER").catch((error: unknown) => {
        if (!/duplicate column/i.test(String(error))) throw error;
      }))
      // Claims from before the lease, or from an older instance, start it now.
      .then(() => execute("UPDATE auth_refresh SET claimed_at = unixepoch() WHERE claimed_at IS NULL"))
      .then(() => execute("CREATE INDEX IF NOT EXISTS auth_refresh_expiry ON auth_refresh(expires_at)"))
      .then(() => execute("DELETE FROM auth_refresh WHERE expires_at < unixepoch()"))
      .then(() => execute("UPDATE auth_refresh SET result = NULL WHERE result_until < unixepoch()"))
      .then(() => undefined)
      .catch((error: unknown) => { schemaPromise = null; throw error; });
  }
  await schemaPromise;
  const key = createHmac("sha256", config.appSecret).update("auth-refresh:v1").digest();
  const tokenKey = createHmac("sha256", key)
    .update(JSON.stringify([config.issuer, config.appId, refreshToken])).digest("hex");
  const owner = randomUUID();
  const claim = await execute(
    `INSERT INTO auth_refresh(token_key, owner, expires_at, claimed_at)
     VALUES (?, ?, unixepoch() + ?, unixepoch())
     ON CONFLICT(token_key) DO UPDATE SET owner = excluded.owner, result = NULL,
       result_until = NULL, reusable = 0, expires_at = excluded.expires_at,
       claimed_at = excluded.claimed_at
     WHERE (auth_refresh.reusable = 1 AND auth_refresh.result_until <= unixepoch())
       OR (auth_refresh.result_until IS NULL AND auth_refresh.claimed_at < unixepoch() - ?)
     RETURNING owner`,
    [tokenKey, owner, AUTH_SESSION_MAX_AGE, CLAIM_LEASE_SECONDS],
  );
  if (claim.rows[0]?.owner === owner) {
    let tokens: LogtoTokenResponse;
    try {
      tokens = LogtoTokenResponseSchema.parse(await exchange());
    } catch (error) {
      const status = (error as { status?: unknown }).status;
      // Share the failure, then release the claim. If a 5xx or timeout spent
      // the token, the retry gets invalid_grant: a clean sign-out, not a claim
      // that blocks every later request.
      await execute(
        `UPDATE auth_refresh SET result = ?, result_until = unixepoch() + 5, reusable = 1
         WHERE token_key = ? AND owner = ?`,
        [
          sealToken(JSON.stringify({ status: typeof status === "number" ? status : null }), key, tokenKey),
          tokenKey,
          owner,
        ],
      ).catch((shareError: unknown) => console.error("[refresh] could not share the failure", shareError));
      throw error;
    }
    // The provider may have rotated the token already, so these are the only
    // valid tokens: return them even if sharing them fails.
    await execute(
      `UPDATE auth_refresh SET result = ?, result_until = unixepoch() + 30, reusable = ?
       WHERE token_key = ? AND owner = ?`,
      [
        sealToken(JSON.stringify(tokens), key, tokenKey),
        !tokens.refresh_token || tokens.refresh_token === refreshToken ? 1 : 0,
        tokenKey,
        owner,
      ],
    ).catch((shareError: unknown) => console.error("[refresh] could not share the result", shareError));
    return tokens;
  }
  // Outlast the lease, so a waiter takes over a dead claim instead of failing.
  const deadline = Date.now() + (CLAIM_LEASE_SECONDS + 5) * 1000;
  do {
    const stored = await execute(
      `SELECT result, result_until, reusable, claimed_at, unixepoch() AS now
       FROM auth_refresh WHERE token_key = ?`,
      [tokenKey],
    );
    const row = stored.rows[0];
    if (row && typeof row.result_until === "number" && typeof row.now === "number") {
      if (row.result_until <= row.now) {
        // The window closed between our claim attempt and this read.
        if (row.reusable === 1) return coordinateRefresh(config, refreshToken, exchange);
        // A rotated token whose result expired is spent: a definitive sign-out.
        throw Object.assign(new Error("Refresh token already used; sign in again"), { status: 401 });
      }
      if (typeof row.result === "string") {
        const shared = JSON.parse(openToken(row.result, key, tokenKey));
        if ("status" in shared) {
          throw Object.assign(new Error(`Session refresh failed (${shared.status ?? "no response"})`), {
            status: shared.status ?? undefined,
          });
        }
        return LogtoTokenResponseSchema.parse(shared);
      }
    } else if (
      row && typeof row.claimed_at === "number" && typeof row.now === "number" &&
      row.claimed_at < row.now - CLAIM_LEASE_SECONDS
    ) {
      // The owner died mid-exchange. The claim statement lets one waiter win.
      return coordinateRefresh(config, refreshToken, exchange);
    }
    await delay(250);
  } while (Date.now() < deadline);
  throw new Error("Session refresh is unavailable; sign in again rather than replaying the token");
}

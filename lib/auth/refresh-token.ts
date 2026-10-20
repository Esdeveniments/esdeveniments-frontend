import "server-only";
import { createHmac, randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { execute } from "@lib/db/turso";
import { AUTH_SESSION_MAX_AGE } from "@utils/constants";
import { LogtoTokenResponseSchema } from "@lib/validation/auth";
import { openToken, sealToken } from "./token-encryption";
import type { LogtoConfig, LogtoTokenResponse } from "types/auth";

const SCHEMA = `CREATE TABLE IF NOT EXISTS auth_refresh (
  token_key TEXT PRIMARY KEY, owner TEXT NOT NULL, result TEXT,
  result_until INTEGER, reusable INTEGER NOT NULL DEFAULT 0,
  expires_at INTEGER NOT NULL
)`;
let schemaPromise: Promise<void> | null = null;

/**
 * Claim once in durable storage, then share an encrypted result across instances.
 * Never steal an in-flight claim: a timed-out process may already have consumed
 * the provider token. Redis is unsuitable here because our cache uses allkeys-lru.
 */
export async function coordinateRefresh(
  config: LogtoConfig,
  refreshToken: string,
  exchange: () => Promise<LogtoTokenResponse>,
): Promise<LogtoTokenResponse> {
  if (!schemaPromise) {
    schemaPromise = execute(SCHEMA)
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
    `INSERT INTO auth_refresh(token_key, owner, expires_at) VALUES (?, ?, unixepoch() + ?)
     ON CONFLICT(token_key) DO UPDATE SET owner = excluded.owner, result = NULL,
       result_until = NULL, reusable = 0, expires_at = excluded.expires_at
     WHERE auth_refresh.reusable = 1 AND auth_refresh.result_until <= unixepoch()
     RETURNING owner`,
    [tokenKey, owner, AUTH_SESSION_MAX_AGE],
  );
  if (claim.rows[0]?.owner === owner) {
    let tokens: LogtoTokenResponse;
    try {
      tokens = LogtoTokenResponseSchema.parse(await exchange());
    } catch (error) {
      const status = (error as { status?: unknown }).status;
      // A 4xx verdict consumed nothing at the provider. Share it so concurrent
      // and later requests fail fast with the same status instead of waiting
      // out the claim, and let the claim be retried once the window passes.
      if (typeof status === "number" && status >= 400 && status < 500) {
        await execute(
          `UPDATE auth_refresh SET result = ?, result_until = unixepoch() + 30, reusable = 1
           WHERE token_key = ? AND owner = ?`,
          [sealToken(JSON.stringify({ status }), key, tokenKey), tokenKey, owner],
        );
      }
      throw error;
    }
    const encrypted = sealToken(JSON.stringify(tokens), key, tokenKey);
    const saved = await execute(
      `UPDATE auth_refresh SET result = ?, result_until = unixepoch() + 30, reusable = ?
       WHERE token_key = ? AND owner = ?`,
      [encrypted, !tokens.refresh_token || tokens.refresh_token === refreshToken ? 1 : 0, tokenKey, owner],
    );
    if (saved.rowsAffected !== 1) throw new Error("Session refresh result could not be persisted");
    return tokens;
  }
  const deadline = Date.now() + 20_000;
  do {
    const stored = await execute(
      `SELECT result, result_until, unixepoch() AS now FROM auth_refresh WHERE token_key = ?`,
      [tokenKey],
    );
    const row = stored.rows[0];
    if (row && typeof row.result_until === "number" && typeof row.now === "number") {
      if (row.result_until <= row.now) break;
      if (typeof row.result === "string") {
        const shared = JSON.parse(openToken(row.result, key, tokenKey));
        if (typeof shared?.status === "number") {
          throw Object.assign(new Error(`Logto token endpoint ${shared.status}`), {
            status: shared.status,
          });
        }
        return LogtoTokenResponseSchema.parse(shared);
      }
    }
    await delay(250);
  } while (Date.now() < deadline);
  throw new Error("Session refresh is unavailable; sign in again rather than replaying the token");
}

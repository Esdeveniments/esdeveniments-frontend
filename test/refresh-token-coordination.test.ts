// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { setTimeout as delay } from "node:timers/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LogtoConfig } from "types/auth";

let db: DatabaseSync;
vi.mock("@lib/db/turso", async (importActual) => ({
  ...(await importActual<typeof import("@lib/db/turso")>()),
  execute: vi.fn(async (sql: string, args: unknown[] = []) => {
    const values = args.map((value) => {
      if (typeof value === "string" || typeof value === "number") return value;
      throw new Error("Unexpected SQL argument");
    });
    const rows = db.prepare(sql).all(...values);
    return { rows, rowsAffected: Number(db.prepare("SELECT changes() AS n").get()?.n) };
  }),
}));

const config: LogtoConfig = {
  endpoint: "https://identity.example",
  issuer: "https://identity.example/oidc",
  appId: "app",
  appSecret: "test-only-client-secret",
  authorizationEndpoint: "https://identity.example/oidc/auth",
  tokenEndpoint: "https://identity.example/oidc/token",
  userinfoEndpoint: "https://identity.example/oidc/me",
  endSessionEndpoint: "https://identity.example/oidc/session/end",
  scope: "openid offline_access",
};
const tokens = {
  access_token: "access-token",
  refresh_token: "rotated-token",
  token_type: "Bearer",
  expires_in: 3600,
};

describe("cross-instance refresh coordination", () => {
  beforeEach(() => {
    vi.resetModules();
    db = new DatabaseSync(":memory:");
  });
  afterEach(() => {
    db.close();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("exchanges once across independent module instances and encrypts the shared result", async () => {
    const first = await import("@lib/auth/logto");
    vi.resetModules();
    const second = await import("@lib/auth/logto");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(tokens)));
    vi.stubGlobal("fetch", fetchMock);
    const results = await Promise.all([
      first.refreshAccessToken(config, "old-token"),
      second.refreshAccessToken(config, "old-token"),
    ]);
    expect(results).toEqual([tokens, tokens]);
    expect(fetchMock).toHaveBeenCalledOnce();
    const stored = JSON.stringify(db.prepare("SELECT * FROM auth_refresh").all());
    expect(stored).not.toContain("access-token");
    expect(stored).not.toContain("rotated-token");
    expect(stored).not.toContain("old-token");
  });

  it("never replays a rotated token after the result window expires", async () => {
    const { coordinateRefresh } = await import("@lib/auth/refresh-token");
    const exchange = vi.fn().mockResolvedValue(tokens);
    await coordinateRefresh(config, "old", exchange);
    // As after the expired-result cleanup, with a claim far older than the lease.
    db.exec("UPDATE auth_refresh SET result_until = unixepoch() - 1, result = NULL, claimed_at = 0");
    await expect(coordinateRefresh(config, "old", exchange)).rejects.toMatchObject({ status: 401 });
    expect(exchange).toHaveBeenCalledOnce();
  });

  it("leases a claim for longer than a live owner can take", async () => {
    const { CLAIM_LEASE_SECONDS } = await import("@lib/auth/refresh-token");
    const { TURSO_TIMEOUT_MS } = await import("@lib/db/turso");
    const { LOGTO_TOKEN_TIMEOUT_MS } = await import("@utils/constants");
    // Claim reply, token request and result write, each up to its timeout.
    expect(CLAIM_LEASE_SECONDS * 1000).toBeGreaterThan(2 * TURSO_TIMEOUT_MS + LOGTO_TOKEN_TIMEOUT_MS);
  });

  it("takes over a claim whose owner died mid-exchange, only after the lease", async () => {
    const { coordinateRefresh, CLAIM_LEASE_SECONDS } = await import("@lib/auth/refresh-token");
    void coordinateRefresh(config, "old", () => new Promise<never>(() => {}));
    await vi.waitFor(() => expect(db.prepare("SELECT owner FROM auth_refresh").get()).toBeDefined());
    const age = db.prepare("UPDATE auth_refresh SET claimed_at = unixepoch() - ?");
    age.run(CLAIM_LEASE_SECONDS - 3);
    const exchange = vi.fn().mockResolvedValue(tokens);
    const waiters = Promise.all([
      coordinateRefresh(config, "old", exchange),
      coordinateRefresh(config, "old", exchange),
    ]);
    await delay(600);
    expect(exchange).not.toHaveBeenCalled();

    age.run(CLAIM_LEASE_SECONDS + 1);
    await expect(waiters).resolves.toEqual([tokens, tokens]);
    expect(exchange).toHaveBeenCalledOnce();
  });

  it("adds the lease to a table created before it and starts the lease of open claims", async () => {
    db.exec(`CREATE TABLE auth_refresh (
      token_key TEXT PRIMARY KEY, owner TEXT NOT NULL, result TEXT,
      result_until INTEGER, reusable INTEGER NOT NULL DEFAULT 0,
      expires_at INTEGER NOT NULL
    )`);
    db.exec("INSERT INTO auth_refresh(token_key, owner, expires_at) VALUES ('legacy', 'old', unixepoch() + 60)");
    const { coordinateRefresh } = await import("@lib/auth/refresh-token");
    await expect(coordinateRefresh(config, "old", vi.fn().mockResolvedValue(tokens))).resolves.toEqual(tokens);
    expect(db.prepare("SELECT claimed_at FROM auth_refresh WHERE token_key = 'legacy'").get())
      .toEqual({ claimed_at: expect.any(Number) });
  });

  it.each([undefined, "old"])("allows later use of a non-rotating token (%s)", async (refresh_token) => {
    const { coordinateRefresh } = await import("@lib/auth/refresh-token");
    const exchange = vi.fn().mockResolvedValue({ ...tokens, refresh_token });
    await coordinateRefresh(config, "old", exchange);
    db.exec("UPDATE auth_refresh SET result_until = unixepoch() - 1");
    await coordinateRefresh(config, "old", exchange);
    expect(exchange).toHaveBeenCalledTimes(2);
  });

  it("does not exchange when durable storage is unavailable", async () => {
    const { coordinateRefresh } = await import("@lib/auth/refresh-token");
    const { execute } = await import("@lib/db/turso");
    vi.mocked(execute).mockRejectedValueOnce(new Error("database unavailable"));
    const exchange = vi.fn();
    await expect(coordinateRefresh(config, "old", exchange)).rejects.toThrow("database unavailable");
    expect(exchange).not.toHaveBeenCalled();
  });

  it("shares an ambiguous provider failure, then retries once the window passes", async () => {
    const { coordinateRefresh } = await import("@lib/auth/refresh-token");
    const exchange = vi.fn().mockRejectedValueOnce(new Error("provider timeout")).mockResolvedValue(tokens);
    await expect(coordinateRefresh(config, "old", exchange)).rejects.toThrow("provider timeout");
    const waiter = await coordinateRefresh(config, "old", exchange).catch((error: unknown) => error);
    expect(waiter).toBeInstanceOf(Error);
    expect((waiter as { status?: number }).status).toBeUndefined();
    expect(exchange).toHaveBeenCalledOnce();

    db.exec("UPDATE auth_refresh SET result_until = unixepoch() - 1");
    await expect(coordinateRefresh(config, "old", exchange)).resolves.toEqual(tokens);
    expect(exchange).toHaveBeenCalledTimes(2);
  });

  it("returns the new tokens when sharing the result fails", async () => {
    const { coordinateRefresh } = await import("@lib/auth/refresh-token");
    const { execute } = await import("@lib/db/turso");
    const run = vi.mocked(execute).getMockImplementation()!;
    vi.mocked(execute).mockImplementation(async (sql, args) =>
      sql.trimStart().startsWith("UPDATE auth_refresh SET result = ?")
        ? Promise.reject(new Error("write failed"))
        : run(sql, args));
    const exchange = vi.fn().mockResolvedValue(tokens);
    try {
      await expect(coordinateRefresh(config, "old", exchange)).resolves.toEqual(tokens);
    } finally {
      // resetModules keeps the mocked module, so restore it for later tests.
      vi.mocked(execute).mockImplementation(run);
    }
  });

  it("shares a definitive provider rejection instead of making later requests wait", async () => {
    const { coordinateRefresh } = await import("@lib/auth/refresh-token");
    const rejected = Object.assign(new Error("invalid_grant"), { status: 400 });
    const exchange = vi.fn().mockRejectedValue(rejected);
    const settled = await Promise.allSettled([
      coordinateRefresh(config, "dead", exchange),
      coordinateRefresh(config, "dead", exchange),
    ]);
    expect(settled.map((r) => r.status === "rejected" && (r.reason as { status?: number }).status))
      .toEqual([400, 400]);
    await expect(coordinateRefresh(config, "dead", exchange)).rejects.toMatchObject({ status: 400 });
    expect(exchange).toHaveBeenCalledOnce();

    db.exec("UPDATE auth_refresh SET result_until = unixepoch() - 1");
    await expect(coordinateRefresh(config, "dead", exchange)).rejects.toMatchObject({ status: 400 });
    expect(exchange).toHaveBeenCalledTimes(2);
  });

  it("rejects a result substituted from another session", async () => {
    const { coordinateRefresh } = await import("@lib/auth/refresh-token");
    const exchange = vi.fn().mockResolvedValue(tokens);
    await coordinateRefresh(config, "one", exchange);
    await coordinateRefresh(config, "two", exchange);
    const rows = db.prepare("SELECT token_key, result FROM auth_refresh ORDER BY rowid").all();
    db.prepare("UPDATE auth_refresh SET result = ? WHERE token_key = ?")
      .run(String(rows[1].result), String(rows[0].token_key));
    await expect(coordinateRefresh(config, "one", exchange)).rejects.toThrow();
    expect(exchange).toHaveBeenCalledTimes(2);
  });
});

// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LogtoConfig } from "types/auth";

let db: DatabaseSync;
vi.mock("@lib/db/turso", () => ({
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
    db.exec("UPDATE auth_refresh SET result_until = unixepoch() - 1");
    await expect(coordinateRefresh(config, "old", exchange)).rejects.toThrow(/sign in again/);
    expect(exchange).toHaveBeenCalledOnce();
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

  it("does not steal a claim after an ambiguous provider timeout", async () => {
    const { coordinateRefresh } = await import("@lib/auth/refresh-token");
    const exchange = vi.fn().mockRejectedValue(new Error("provider timeout"));
    await expect(coordinateRefresh(config, "old", exchange)).rejects.toThrow("provider timeout");
    vi.spyOn(Date, "now").mockReturnValueOnce(0).mockReturnValue(20_001);
    await expect(coordinateRefresh(config, "old", exchange)).rejects.toThrow(/sign in again/);
    expect(exchange).toHaveBeenCalledOnce();
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
    const rows = db.prepare("SELECT token_key, result FROM auth_refresh").all();
    db.prepare("UPDATE auth_refresh SET result = ? WHERE token_key = ?")
      .run(String(rows[1].result), String(rows[0].token_key));
    await expect(coordinateRefresh(config, "one", exchange)).rejects.toThrow();
    expect(exchange).toHaveBeenCalledTimes(2);
  });
});

import { describe, it, expect } from "vitest";
import { noopAdapter } from "../lib/auth/adapter";
import { createMockAdapter } from "../lib/auth/mock-adapter";

describe("NoopAuthAdapter", () => {
  it("returns not-configured on login", async () => {
    const result = await noopAdapter.login({ email: "a@b.com", password: "x" });
    expect(result.success).toBe(false);
    expect(result.error).toBe("not-configured");
  });

  it("returns not-configured on register", async () => {
    const result = await noopAdapter.register({ email: "a@b.com", password: "x" });
    expect(result.success).toBe(false);
    expect(result.error).toBe("not-configured");
  });

  it("returns null session", async () => {
    expect(await noopAdapter.getSession()).toBeNull();
  });

  it("returns cleanup function from onAuthStateChange", () => {
    const unsub = noopAdapter.onAuthStateChange(() => {});
    expect(typeof unsub).toBe("function");
    unsub();
  });
});

describe("MockAuthAdapter", () => {
  it("logs in with preloaded user", async () => {
    const adapter = createMockAdapter({
      delay: 0,
      preloadUsers: [{ email: "u@t.com", password: "pass" }],
    });
    const result = await adapter.login({ email: "u@t.com", password: "pass" });
    expect(result.success).toBe(true);
    expect(result.user?.email).toBe("u@t.com");
  });

  it("rejects invalid credentials", async () => {
    const adapter = createMockAdapter({
      delay: 0,
      preloadUsers: [{ email: "u@t.com", password: "pass" }],
    });
    const result = await adapter.login({ email: "u@t.com", password: "wrong" });
    expect(result.success).toBe(false);
    expect(result.error).toBe("invalid-credentials");
  });

  it("registers a new user", async () => {
    const adapter = createMockAdapter({ delay: 0 });
    const result = await adapter.register({
      email: "new@t.com",
      password: "pass123",
      displayName: "New User",
    });
    expect(result.success).toBe(true);
    expect(result.user?.email).toBe("new@t.com");
    expect(result.user?.displayName).toBe("New User");
  });

  it("rejects duplicate registration", async () => {
    const adapter = createMockAdapter({
      delay: 0,
      preloadUsers: [{ email: "dup@t.com", password: "pass" }],
    });
    const result = await adapter.register({ email: "dup@t.com", password: "pass" });
    expect(result.success).toBe(false);
    expect(result.error).toBe("email-taken");
  });

  it("logout clears session", async () => {
    const adapter = createMockAdapter({
      delay: 0,
      preloadUsers: [{ email: "u@t.com", password: "p" }],
    });
    await adapter.login({ email: "u@t.com", password: "p" });
    expect(await adapter.getSession()).not.toBeNull();
    await adapter.logout();
    expect(await adapter.getSession()).toBeNull();
  });

  it("notifies listeners on state change", async () => {
    const adapter = createMockAdapter({
      delay: 0,
      preloadUsers: [{ email: "u@t.com", password: "p" }],
    });
    const events: (string | null)[] = [];
    adapter.onAuthStateChange((user) => events.push(user?.email ?? null));

    await adapter.login({ email: "u@t.com", password: "p" });
    await adapter.logout();

    expect(events).toEqual(["u@t.com", null]);
  });

  it("unsubscribe stops notifications", async () => {
    const adapter = createMockAdapter({
      delay: 0,
      preloadUsers: [{ email: "u@t.com", password: "p" }],
    });
    const events: (string | null)[] = [];
    const unsub = adapter.onAuthStateChange((user) =>
      events.push(user?.email ?? null)
    );

    await adapter.login({ email: "u@t.com", password: "p" });
    unsub();
    await adapter.logout();

    expect(events).toEqual(["u@t.com"]);
  });

  it("respects supportedMethods config", () => {
    const adapter = createMockAdapter({
      supportedMethods: ["magic-link", "oauth-google"],
    });
    expect(adapter.supportedMethods).toEqual(["magic-link", "oauth-google"]);
  });
});

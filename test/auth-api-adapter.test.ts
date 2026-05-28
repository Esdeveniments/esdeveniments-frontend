import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";
import { createApiAdapter } from "../lib/auth/api-adapter";

const mockFetch = vi.fn();

vi.stubGlobal("fetch", mockFetch);
vi.useFakeTimers({ shouldAdvanceTime: false });

afterAll(() => {
  vi.useRealTimers();
});

const UUID = "550e8400-e29b-41d4-a716-446655440001";

function loginResponse(overrides?: Record<string, unknown>) {
  return jsonResponse({
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    user: {
      id: UUID,
      email: "a@b.com",
      name: "Alice",
      username: "alice",
      role: "USER",
      emailVerified: true,
    },
    ...overrides,
  });
}

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.clearAllTimers();
});

afterEach(() => {
  vi.clearAllTimers();
});

describe("createApiAdapter (cookie-based auth)", () => {
  describe("login", () => {
    it("calls /api/auth/login and returns user (no tokens in response)", async () => {
      mockFetch.mockResolvedValue(loginResponse());

      const adapter = createApiAdapter();
      const result = await adapter.login({ email: "a@b.com", password: "pass" });

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe("a@b.com");
      expect(result.user?.name).toBe("Alice");
      expect(result.user?.id).toBe(UUID);
    });

    it("sends POST with JSON body to /api/auth/login", async () => {
      mockFetch.mockResolvedValue(loginResponse());

      const adapter = createApiAdapter();
      await adapter.login({ email: "a@b.com", password: "pass" });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("/api/auth/login");
      expect(options.method).toBe("POST");
      expect(JSON.parse(options.body)).toEqual({
        email: "a@b.com",
        password: "pass",
      });
    });

    it("does not send Authorization header (cookies are automatic)", async () => {
      mockFetch.mockResolvedValue(loginResponse());

      const adapter = createApiAdapter();
      await adapter.login({ email: "a@b.com", password: "pass" });

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.headers?.Authorization).toBeUndefined();
    });

    it("returns error on non-ok response", async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({ error: "invalid-credentials" }, 401)
      );

      const adapter = createApiAdapter();
      const result = await adapter.login({ email: "a@b.com", password: "wrong" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("invalid-credentials");
    });

    it("maps the new auth error codes from the backend", async () => {
      const cases: Array<{
        backend: string;
        status: number;
        expected: string;
      }> = [
        { backend: "email-not-verified", status: 403, expected: "email-not-verified" },
        { backend: "account-locked", status: 423, expected: "account-locked" },
        { backend: "invalid-email", status: 400, expected: "invalid-email" },
      ];
      for (const c of cases) {
        mockFetch.mockResolvedValueOnce(jsonResponse({ error: c.backend }, c.status));
        const result = await createApiAdapter().login({ email: "a@b.com", password: "p" });
        expect(result.error).toBe(c.expected);
      }
    });

    it("falls back to invalid-credentials on unmapped 4xx (don't reveal account existence)", async () => {
      // Backend returned a 401 with a code we don't recognize. Showing the
      // user "Incorrect email or password" is the better UX *and* doesn't
      // leak whether the email is registered.
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ error: "user_not_found" }, 401)
      );
      const result = await createApiAdapter().login({
        email: "ghost@example.com",
        password: "anything",
      });
      expect(result.error).toBe("invalid-credentials");
    });

    it("falls back to server-error on 5xx, rate-limited on 429 (no enum collapse)", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({ error: "boom" }, 503));
      let result = await createApiAdapter().login({ email: "a@b.com", password: "p" });
      expect(result.error).toBe("server-error");

      mockFetch.mockResolvedValueOnce(jsonResponse({ error: "slow_down" }, 429));
      result = await createApiAdapter().login({ email: "a@b.com", password: "p" });
      expect(result.error).toBe("rate-limited");
    });

    it("returns network-error on exception", async () => {
      mockFetch.mockRejectedValue(new Error("fetch failed"));

      const adapter = createApiAdapter();
      const result = await adapter.login({ email: "a@b.com", password: "pass" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("network-error");
    });

    it("notifies listeners on successful login", async () => {
      mockFetch.mockResolvedValue(loginResponse());

      const adapter = createApiAdapter();
      const events: (string | null)[] = [];
      adapter.onAuthStateChange((user) => events.push(user?.email ?? null));

      await adapter.login({ email: "a@b.com", password: "pass" });
      expect(events).toEqual(["a@b.com"]);
    });
  });

  describe("register", () => {
    it("returns success with message and requiresVerification", async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({ message: "Please verify your email." })
      );

      const adapter = createApiAdapter();
      const result = await adapter.register({
        email: "new@b.com",
        password: "pass123",
        name: "New User",
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("Please verify your email.");
      expect(result.requiresVerification).toBe(true);
    });

    it("sends name as 'name' field", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ message: "ok" }));

      const adapter = createApiAdapter();
      await adapter.register({ email: "x@y.com", password: "p", name: "Xavi" });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.name).toBe("Xavi");
    });

    it("falls back to email prefix when no name", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ message: "ok" }));

      const adapter = createApiAdapter();
      await adapter.register({ email: "alice@test.com", password: "p" });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.name).toBe("alice");
    });

    it("returns error on duplicate email", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ error: "email-taken" }, 409));

      const adapter = createApiAdapter();
      const result = await adapter.register({ email: "dup@b.com", password: "p" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("email-taken");
    });
  });

  describe("getSession", () => {
    it("fetches /api/auth/me on fresh adapter (no cached user)", async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({
          id: UUID,
          email: "a@b.com",
          name: "A",
          username: "alice",
          role: "USER",
          emailVerified: true,
        })
      );

      const adapter = createApiAdapter();
      const user = await adapter.getSession();

      expect(user?.email).toBe("a@b.com");
      expect(mockFetch).toHaveBeenCalledWith("/api/auth/me", expect.any(Object));
    });

    it("returns cached user after login without extra fetch", async () => {
      mockFetch.mockResolvedValue(loginResponse());

      const adapter = createApiAdapter();
      await adapter.login({ email: "a@b.com", password: "p" });

      mockFetch.mockClear();
      const session = await adapter.getSession();
      expect(session?.email).toBe("a@b.com");
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("returns null when /api/auth/me returns 401 and refresh fails", async () => {
      // /me returns 401
      mockFetch.mockResolvedValueOnce(jsonResponse({ error: "expired" }, 401));
      // /refresh also fails
      mockFetch.mockResolvedValueOnce(jsonResponse({ error: "invalid" }, 401));

      const adapter = createApiAdapter();
      const user = await adapter.getSession();

      expect(user).toBeNull();
    });

    it("retries /me after successful refresh on 401", async () => {
      // First /me returns 401
      mockFetch.mockResolvedValueOnce(jsonResponse({ error: "expired" }, 401));
      // /refresh succeeds
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ expiresAt: new Date(Date.now() + 3600000).toISOString() })
      );
      // Retry /me succeeds
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          id: UUID,
          email: "a@b.com",
          name: "A",
          username: "alice",
          role: "USER",
          emailVerified: true,
        })
      );

      const adapter = createApiAdapter();
      const user = await adapter.getSession();

      expect(user?.email).toBe("a@b.com");
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it("returns null when /me returns invalid shape", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ unexpected: "shape" }));

      const adapter = createApiAdapter();
      const user = await adapter.getSession();

      expect(user).toBeNull();
    });
  });

  describe("logout", () => {
    it("calls /api/auth/logout and clears session", async () => {
      mockFetch.mockResolvedValue(loginResponse());

      const adapter = createApiAdapter();
      await adapter.login({ email: "a@b.com", password: "p" });

      mockFetch.mockClear();
      mockFetch.mockResolvedValue(jsonResponse({ message: "Logged out" }));

      await adapter.logout();

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/auth/logout",
        expect.objectContaining({ method: "POST" })
      );
    });

    it("notifies listeners on logout", async () => {
      mockFetch.mockResolvedValue(loginResponse());

      const adapter = createApiAdapter();
      const events: (string | null)[] = [];
      adapter.onAuthStateChange((user) => events.push(user?.email ?? null));

      await adapter.login({ email: "a@b.com", password: "p" });

      mockFetch.mockResolvedValue(jsonResponse({ message: "Logged out" }));
      await adapter.logout();

      expect(events).toEqual(["a@b.com", null]);
    });
  });

  describe("onAuthStateChange", () => {
    it("unsubscribe stops notifications", async () => {
      mockFetch.mockResolvedValue(loginResponse());

      const adapter = createApiAdapter();
      const events: (string | null)[] = [];
      const unsub = adapter.onAuthStateChange((user) =>
        events.push(user?.email ?? null)
      );

      await adapter.login({ email: "a@b.com", password: "p" });
      unsub();

      mockFetch.mockResolvedValue(jsonResponse({ message: "Logged out" }));
      await adapter.logout();

      expect(events).toEqual(["a@b.com"]);
    });
  });

  describe("supportedMethods", () => {
    it("exposes credentials as supported method", () => {
      const adapter = createApiAdapter();
      expect(adapter.supportedMethods).toEqual(["credentials"]);
    });
  });

  describe("edge cases", () => {
    it("returns unknown error when login response fails Zod parsing", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ unexpected: "shape" }));

      const adapter = createApiAdapter();
      const result = await adapter.login({ email: "a@b.com", password: "p" });

      expect(result.success).toBe(false);
      expect(result.error).toBe("unknown");
    });

    it("handles NaN expiresAt by falling through to /me on getSession", async () => {
      mockFetch.mockResolvedValueOnce(loginResponse({ expiresAt: "not-a-date" }));

      const adapter = createApiAdapter();
      const result = await adapter.login({ email: "a@b.com", password: "p" });
      expect(result.success).toBe(true);

      // expiresAt is null, so getSession skips cache and calls /me
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          id: UUID,
          email: "a@b.com",
          name: "Alice",
          username: "alice",
          role: "USER",
          emailVerified: true,
        })
      );

      const session = await adapter.getSession();
      expect(session?.email).toBe("a@b.com");
    });

    it("handles network error in logout gracefully", async () => {
      mockFetch.mockResolvedValue(loginResponse());

      const adapter = createApiAdapter();
      await adapter.login({ email: "a@b.com", password: "p" });

      mockFetch.mockRejectedValue(new Error("network down"));
      // Should not throw
      await adapter.logout();
    });
  });
});

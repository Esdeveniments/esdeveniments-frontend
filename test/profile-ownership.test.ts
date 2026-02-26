import { describe, it, expect } from "vitest";
import { createMockAdapter } from "../lib/auth/mock-adapter";

describe("Profile ownership via MockAdapter", () => {
  it("pre-seeded user has profileSlug", async () => {
    const adapter = createMockAdapter({
      delay: 0,
      preloadUsers: [
        { email: "owner@test.com", password: "p", displayName: "Venue", profileSlug: "my-venue" },
      ],
    });

    const result = await adapter.login({ email: "owner@test.com", password: "p" });
    expect(result.success).toBe(true);
    expect(result.user?.profileSlug).toBe("my-venue");
  });

  it("registered user has no profileSlug by default", async () => {
    const adapter = createMockAdapter({ delay: 0 });
    const result = await adapter.register({ email: "new@test.com", password: "pass" });
    expect(result.success).toBe(true);
    expect(result.user?.profileSlug).toBeUndefined();
  });

  it("session preserves profileSlug", async () => {
    const adapter = createMockAdapter({
      delay: 0,
      preloadUsers: [
        { email: "o@t.com", password: "p", profileSlug: "slug" },
      ],
    });

    await adapter.login({ email: "o@t.com", password: "p" });
    const session = await adapter.getSession();
    expect(session?.profileSlug).toBe("slug");
  });

  it("logout clears profileSlug from session", async () => {
    const adapter = createMockAdapter({
      delay: 0,
      preloadUsers: [
        { email: "o@t.com", password: "p", profileSlug: "slug" },
      ],
    });

    await adapter.login({ email: "o@t.com", password: "p" });
    await adapter.logout();
    expect(await adapter.getSession()).toBeNull();
  });
});

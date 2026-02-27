import { describe, it, expect } from "vitest";
import { createMockAdapter } from "../lib/auth/mock-adapter";

describe("User roles in MockAdapter", () => {
  it("pre-seeded organizer has role and profileSlug", async () => {
    const adapter = createMockAdapter({
      delay: 0,
      preloadUsers: [
        {
          email: "venue@test.com",
          password: "p",
          displayName: "Razzmatazz",
          role: "organizer",
          profileSlug: "razzmatazz",
        },
      ],
    });
    const result = await adapter.login({ email: "venue@test.com", password: "p" });
    expect(result.success).toBe(true);
    expect(result.user?.role).toBe("organizer");
    expect(result.user?.profileSlug).toBe("razzmatazz");
  });

  it("pre-seeded regular user has role 'user' and no profileSlug", async () => {
    const adapter = createMockAdapter({
      delay: 0,
      preloadUsers: [
        {
          email: "maria@test.com",
          password: "p",
          displayName: "Maria",
          role: "user",
        },
      ],
    });
    const result = await adapter.login({ email: "maria@test.com", password: "p" });
    expect(result.success).toBe(true);
    expect(result.user?.role).toBe("user");
    expect(result.user?.profileSlug).toBeUndefined();
  });

  it("registered user defaults to role 'user'", async () => {
    const adapter = createMockAdapter({ delay: 0 });
    const result = await adapter.register({
      email: "new@test.com",
      password: "pass123",
      displayName: "New",
    });
    expect(result.success).toBe(true);
    expect(result.user?.role).toBe("user");
    expect(result.user?.profileSlug).toBeUndefined();
  });

  it("pre-seeded user without explicit role defaults to 'user'", async () => {
    const adapter = createMockAdapter({
      delay: 0,
      preloadUsers: [{ email: "old@test.com", password: "p" }],
    });
    const result = await adapter.login({ email: "old@test.com", password: "p" });
    expect(result.success).toBe(true);
    expect(result.user?.role).toBe("user");
  });

  it("organizer and regular user coexist in same adapter", async () => {
    const adapter = createMockAdapter({
      delay: 0,
      preloadUsers: [
        { email: "venue@t.com", password: "v", role: "organizer", profileSlug: "venue" },
        { email: "user@t.com", password: "u", role: "user" },
      ],
    });

    const venueResult = await adapter.login({ email: "venue@t.com", password: "v" });
    expect(venueResult.user?.role).toBe("organizer");
    expect(venueResult.user?.profileSlug).toBe("venue");

    await adapter.logout();

    const userResult = await adapter.login({ email: "user@t.com", password: "u" });
    expect(userResult.user?.role).toBe("user");
    expect(userResult.user?.profileSlug).toBeUndefined();
  });

  it("session preserves role after login", async () => {
    const adapter = createMockAdapter({
      delay: 0,
      preloadUsers: [
        { email: "o@t.com", password: "p", role: "organizer", profileSlug: "s" },
      ],
    });
    await adapter.login({ email: "o@t.com", password: "p" });
    const session = await adapter.getSession();
    expect(session?.role).toBe("organizer");
    expect(session?.profileSlug).toBe("s");
  });
});

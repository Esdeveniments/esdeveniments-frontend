import { describe, it, expect } from "vitest";
import { profileUpdateSchema } from "../lib/validation/auth";
import { parseUserPublic } from "../lib/validation/user";

describe("profileUpdateSchema", () => {
  it("accepts a minimal valid payload", () => {
    const r = profileUpdateSchema.safeParse({
      username: "alex-91",
      displayName: "Alex García",
    });
    expect(r.success).toBe(true);
  });

  it("accepts a payload with bio", () => {
    const r = profileUpdateSchema.safeParse({
      username: "alex-91",
      displayName: "Alex García",
      bio: "Organizing concerts.",
    });
    expect(r.success).toBe(true);
  });

  it("rejects username shorter than 3 chars", () => {
    const r = profileUpdateSchema.safeParse({
      username: "ab",
      displayName: "Alex",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].message).toBe("usernameTooShort");
    }
  });

  it("rejects username longer than 30 chars", () => {
    const r = profileUpdateSchema.safeParse({
      username: "a".repeat(31),
      displayName: "Alex",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].message).toBe("usernameTooLong");
    }
  });

  it("rejects usernames with uppercase (case-sensitive regex)", () => {
    const r = profileUpdateSchema.safeParse({
      username: "Alex-91",
      displayName: "Alex",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].message).toBe("usernameInvalidChars");
    }
  });

  it("rejects the user- reserved prefix", () => {
    const r = profileUpdateSchema.safeParse({
      username: "user-alex91",
      displayName: "Alex",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].message).toBe("usernameReservedPrefix");
    }
  });

  it("rejects reserved usernames (case-insensitive)", () => {
    for (const reserved of ["admin", "Admin", "ADMIN", "auth", "me"]) {
      const r = profileUpdateSchema.safeParse({
        username: reserved,
        displayName: "Alex",
      });
      expect(r.success).toBe(false);
    }
  });

  it("rejects consecutive or edge hyphens", () => {
    for (const bad of ["-alex", "alex-", "al--ex"]) {
      const r = profileUpdateSchema.safeParse({
        username: bad,
        displayName: "Alex",
      });
      expect(r.success).toBe(false);
    }
  });

  it("rejects empty displayName", () => {
    const r = profileUpdateSchema.safeParse({
      username: "alex-91",
      displayName: "",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].message).toBe("displayNameRequired");
    }
  });

  it("rejects displayName longer than 80 chars", () => {
    const r = profileUpdateSchema.safeParse({
      username: "alex-91",
      displayName: "x".repeat(81),
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].message).toBe("displayNameTooLong");
    }
  });

  it("rejects bio longer than 500 chars", () => {
    const r = profileUpdateSchema.safeParse({
      username: "alex-91",
      displayName: "Alex",
      bio: "x".repeat(501),
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].message).toBe("bioTooLong");
    }
  });

  it("trims whitespace before validating", () => {
    const r = profileUpdateSchema.safeParse({
      username: "  alex-91  ",
      displayName: "  Alex García  ",
      bio: "  bio  ",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.username).toBe("alex-91");
      expect(r.data.displayName).toBe("Alex García");
      expect(r.data.bio).toBe("bio");
    }
  });
});

// `patchMeProfileExternal` (lib/api/users-external.ts) parses the
// PATCH /api/users/me/profile response with `parseUserPublic`, the same
// parser as GET /api/users/{username}. This was confirmed against the real
// preprod backend on 2026-07-27: an earlier, untested schema assumed the
// PATCH response mirrored GET /api/auth/me (expecting email/profileCompleted/
// role/lastLoginAt), which made every real profile save 502 — the actual
// response never carries those fields.
describe("parseUserPublic (PATCH /api/users/me/profile response shape)", () => {
  it("parses the real backend payload observed 2026-07-27", () => {
    const payload = {
      id: "e10c6a5f-306c-487f-9e71-876f67c7bbb2",
      displayName: "Esdeveniments Catalunya",
      username: "esdeveniments-catalunya-cat",
      bio: "Compte de prova QA agent-browser.",
      avatarUrl: null,
      organizerVerified: false,
      eventCount: 4,
      totalEventVisits: 21,
      createdAt: "2026-07-10T16:00:27.49072",
    };
    const result = parseUserPublic(payload);
    expect(result).not.toBeNull();
    expect(result?.username).toBe("esdeveniments-catalunya-cat");
    expect(result?.bio).toBe("Compte de prova QA agent-browser.");
  });

  it("does NOT require email/profileCompleted/role/lastLoginAt", () => {
    // The wrong, now-removed schema rejected this exact shape.
    const result = parseUserPublic({
      id: "uuid-1",
      displayName: "Alex García",
      username: "alex91",
      bio: null,
      avatarUrl: null,
      organizerVerified: false,
      eventCount: 0,
      totalEventVisits: 0,
      createdAt: "2026-07-25T18:10:05Z",
    });
    expect(result).not.toBeNull();
  });

  it("returns null for a completely invalid payload", () => {
    expect(parseUserPublic(null)).toBeNull();
    expect(parseUserPublic("not an object")).toBeNull();
  });
});

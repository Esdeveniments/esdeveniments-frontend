import { describe, it, expect } from "vitest";
import {
  parseProfileUpdateResponse,
  profileUpdateSchema,
} from "../lib/validation/auth";

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

describe("parseProfileUpdateResponse", () => {
  it("parses a valid backend payload", () => {
    const payload = {
      id: "uuid-1",
      email: "alex@example.com",
      displayName: "Alex García",
      username: "alex91",
      bio: "Concerts.",
      avatarUrl: null,
      organizerVerified: false,
      profileCompleted: true,
      role: "USER",
      lastLoginAt: "2026-07-25T18:10:05Z",
    };
    const result = parseProfileUpdateResponse(payload);
    expect(result).not.toBeNull();
    expect(result?.username).toBe("alex91");
    expect(result?.profileCompleted).toBe(true);
  });

  it("returns null on a missing required field", () => {
    const result = parseProfileUpdateResponse({
      id: "uuid-1",
      email: "alex@example.com",
      displayName: "Alex García",
      username: "alex91",
      bio: null,
      avatarUrl: null,
      organizerVerified: false,
      // profileCompleted missing → should reject
      role: "USER",
      lastLoginAt: "2026-07-25T18:10:05Z",
    });
    expect(result).toBeNull();
  });

  it("returns null for a completely invalid payload", () => {
    expect(parseProfileUpdateResponse(null)).toBeNull();
    expect(parseProfileUpdateResponse("not an object")).toBeNull();
  });

  it("preserves extra backend fields via .passthrough()", () => {
    const payload = {
      id: "uuid-1",
      email: "alex@example.com",
      displayName: "Alex García",
      username: "alex91",
      bio: null,
      avatarUrl: null,
      organizerVerified: false,
      profileCompleted: true,
      role: "USER",
      lastLoginAt: "2026-07-25T18:10:05Z",
      // Forwards-compatible field the backend might add later:
      bioSummary: "Music lover",
    };
    const result = parseProfileUpdateResponse(payload);
    expect(result).not.toBeNull();
    // .passthrough() preserves the extra field at runtime; cast through
    // unknown so TS accepts reading a non-typed property name without
    // widening the public ProfileUpdateResponseDTO contract.
    const raw = result as unknown as Record<string, unknown>;
    expect(raw.bioSummary).toBe("Music lover");
  });
});

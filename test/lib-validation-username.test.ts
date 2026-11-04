import { describe, it, expect } from "vitest";
import { usernameSchema } from "../lib/validation/username";

describe("usernameSchema (Zod)", () => {
  it("accepts a valid lowercase username", () => {
    const r = usernameSchema.safeParse("alex-91");
    expect(r.success).toBe(true);
  });

  it("rejects values shorter than 3 chars", () => {
    const r = usernameSchema.safeParse("ab");
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].message).toBe("usernameTooShort");
    }
  });

  it("rejects values longer than 30 chars", () => {
    const r = usernameSchema.safeParse("a".repeat(31));
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].message).toBe("usernameTooLong");
    }
  });

  it("rejects uppercase (case-sensitive regex)", () => {
    const r = usernameSchema.safeParse("Alex-91");
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].message).toBe("usernameInvalidChars");
    }
  });

  it("rejects the user- reserved prefix in any case", () => {
    const lower = usernameSchema.safeParse("user-alex91");
    expect(lower.success).toBe(false);
    // The case-sensitive reserved-prefix regex requires lowercase "user-",
    // so "User-alex91" would fail the regex first (usernameInvalidChars).
    const upper = usernameSchema.safeParse("User-alex91");
    expect(upper.success).toBe(false);
    if (!upper.success) {
      expect(upper.error.issues[0].message).toBe("usernameInvalidChars");
    }
  });

  it("rejects reserved usernames (reserved-list refinement)", () => {
    // Inputs must pass length (>=3) AND regex [a-z0-9-] first so the
    // reserved-list refinement is the one that fires. Old loop values
    // ("Me" 2 chars length-fails; "Admin"/"ADMIN" uppercase regex-fails
    // before the refine) hit earlier branches and never exercised the
    // reserved code path. PR review thread 121c was the trigger.
    for (const reserved of ["admin", "api", "auth", "login", "logout"]) {
      const r = usernameSchema.safeParse(reserved);
      expect(r.success).toBe(false);
      if (!r.success) {
        expect(r.error.issues[0].message).toBe("usernameReserved");
      }
    }
  });

  it("trims whitespace before evaluating", () => {
    const r = usernameSchema.safeParse("  alex-91  ");
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).toBe("alex-91");
    }
  });

  it("rejects consecutive/edge hyphens", () => {
    for (const bad of ["-alex", "alex-", "al--ex"]) {
      expect(usernameSchema.safeParse(bad).success).toBe(false);
    }
  });
});

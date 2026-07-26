import { describe, it, expect } from "vitest";
import { validateUsername } from "../utils/username-validation";

describe("validateUsername (pure fn, client-side live feedback)", () => {
  it("accepts a valid lowercase username", () => {
    expect(validateUsername("alex-91")).toEqual({ ok: true });
  });

  it("accepts digits and hyphens", () => {
    expect(validateUsername("u123-456")).toEqual({ ok: true });
  });

  it("rejects values shorter than 3 chars", () => {
    expect(validateUsername("ab")).toEqual({
      ok: false,
      code: "usernameTooShort",
    });
  });

  it("rejects values longer than 30 chars", () => {
    expect(validateUsername("a".repeat(31))).toEqual({
      ok: false,
      code: "usernameTooLong",
    });
  });

  it("rejects uppercase chars (case-sensitive, no implicit lowercase)", () => {
    expect(validateUsername("Alex-91")).toEqual({
      ok: false,
      code: "usernameInvalidChars",
    });
  });

  it("rejects special characters", () => {
    expect(validateUsername("alex@91")).toEqual({
      ok: false,
      code: "usernameInvalidChars",
    });
    expect(validateUsername("alex 91")).toEqual({
      ok: false,
      code: "usernameInvalidChars",
    });
    expect(validateUsername("álex")).toEqual({
      ok: false,
      code: "usernameInvalidChars",
    });
  });

  it("rejects edge or consecutive hyphens", () => {
    expect(validateUsername("-alex")).toEqual({
      ok: false,
      code: "usernameInvalidChars",
    });
    expect(validateUsername("alex-")).toEqual({
      ok: false,
      code: "usernameInvalidChars",
    });
    expect(validateUsername("al--ex")).toEqual({
      ok: false,
      code: "usernameInvalidChars",
    });
  });

  it("rejects the reserved user- prefix", () => {
    expect(validateUsername("user-alex91")).toEqual({
      ok: false,
      code: "usernameReservedPrefix",
    });
  });

  it("rejects exactly the reserved usernames list (length >= 3)", () => {
    // The reserved list includes "me" (length 2) but the length-3 minimum
    // fires first; documented separately below. Loop only over entries that
    // survive the length check so each iteration reaches the reserved branch.
    for (const reserved of [
      "admin",
      "api",
      "auth",
      "eventos",
      "usuarios",
      "login",
      "logout",
    ]) {
      expect(validateUsername(reserved)).toEqual({
        ok: false,
        code: "usernameReserved",
      });
    }
  });

  it("rejects 'me' as usernameTooShort (length < 3 fires before reserved check)", () => {
    // The backend's reserved list contains "me" but it's also shorter than
    // the 3-char minimum. Client + Zod agree: length wins, so the user sees
    // "usernameTooShort" (more actionable than "reserved").
    expect(validateUsername("me")).toEqual({
      ok: false,
      code: "usernameTooShort",
    });
  });

  it("does not lowercase before validation (CodeRabbit-flagged behavior)", () => {
    // UsernameSchema in lib/validation/username.ts does NOT lowercase. The
    // pure fn must mirror it exactly; otherwise the client says "ok" then
    // backend 400s. Uppercase "Admin" is therefore NOT reserved-validated
    // (it's caught by the case-sensitive regex as usernameInvalidChars).
    const result = validateUsername("Admin");
    expect(result).toEqual({ ok: false, code: "usernameInvalidChars" });
  });

  it("trims whitespace before evaluating length", () => {
    expect(validateUsername("  alex-91  ")).toEqual({ ok: true });
    expect(validateUsername("  ab  ")).toEqual({
      ok: false,
      code: "usernameTooShort",
    });
  });

  it("returns usernameTooShort when input is whitespace-only (trim → empty)", () => {
    // Edge case: trim → "" → length 0 < 3 fires the first branch,
    // returning usernameTooShort (not usernameInvalidChars, since
    // MATCH_USERNAME_RE is never reached when length fails first).
    expect(validateUsername("   ")).toEqual({
      ok: false,
      code: "usernameTooShort",
    });
  });

  it("treats nullish input the same as empty string", () => {
    expect(validateUsername(null as unknown as string)).toEqual({
      ok: false,
      code: "usernameTooShort",
    });
    expect(validateUsername(undefined as unknown as string)).toEqual({
      ok: false,
      code: "usernameTooShort",
    });
  });
});

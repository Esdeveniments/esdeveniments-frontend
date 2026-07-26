import { describe, it, expect } from "vitest";
import { getProfileSlug } from "../utils/user-helpers";

const baseUser = {
  id: "user-123",
  name: "Joan Doe",
  username: "joan-doe",
  email: "joan@example.com",
};

describe("getProfileSlug", () => {
  it("prefers username", () => {
    expect(getProfileSlug(baseUser)).toBe("joan-doe");
  });

  it("falls back to a sanitized display name when username is missing", () => {
    expect(getProfileSlug({ ...baseUser, username: "" })).toBe("joan-doe");
  });

  it("falls back to empty string when name is an email", () => {
    expect(
      getProfileSlug({
        id: "user-123",
        name: "esdevenimentscatalunyacat@gmail.com",
        username: "",
        email: "esdevenimentscatalunyacat@gmail.com",
      }),
    ).toBe("");
  });

  it("falls back to empty string when name equals the user's email", () => {
    expect(
      getProfileSlug({
        id: "user-456",
        name: "joan@example.com",
        username: "",
        email: "joan@example.com",
      }),
    ).toBe("");
  });

  it("falls back to empty string when name is empty", () => {
    expect(
      getProfileSlug({
        id: "user-789",
        name: "",
        username: "",
        email: "joan@example.com",
      }),
    ).toBe("");
  });

  it("falls back to empty string when username is an email", () => {
    expect(
      getProfileSlug({
        id: "user-abc",
        name: "",
        username: "joan@example.com",
        email: "joan@example.com",
      }),
    ).toBe("");
  });

  it("trims whitespace from username before using it", () => {
    expect(
      getProfileSlug({
        id: "user-def",
        name: "",
        username: "  joan-doe  ",
        email: "joan@example.com",
      }),
    ).toBe("joan-doe");
  });

  it("trims whitespace from name before using it", () => {
    expect(
      getProfileSlug({
        id: "user-ghi",
        name: "  Joan Doe  ",
        username: "",
        email: "joan@example.com",
      }),
    ).toBe("joan-doe");
  });

  it("returns an empty string for a null/undefined user", () => {
    expect(getProfileSlug(null)).toBe("");
    expect(getProfileSlug(undefined)).toBe("");
  });

  it("returns empty string when username is a raw UUID", () => {
    expect(
      getProfileSlug({
        id: "user-uuid",
        name: "Joan Doe",
        username: "550e8400-e29b-41d4-a716-446655440000",
        email: "joan@example.com",
      }),
    ).toBe("joan-doe"); // falls back to sanitized name
  });

  it("returns empty string when both username and name are UUIDs", () => {
    expect(
      getProfileSlug({
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "550e8400-e29b-41d4-a716-446655440000",
        username: "550e8400-e29b-41d4-a716-446655440000",
        email: "joan@example.com",
      }),
    ).toBe("");
  });

  it("returns empty string when name sanitizes to the n-a fallback", () => {
    expect(
      getProfileSlug({
        id: "user-xyz",
        name: "!!!",
        username: "",
        email: "joan@example.com",
      }),
    ).toBe("");
  });

  // ── 2026-07-25 backend shape (OwnerSummaryDTO) — no email, no name ──
  //
  // The new event-creator payload drops `email` and `name`. getProfileSlug
  // should still produce the username URL safely from the new shape.

  it("accepts the new owner shape and prefers username", () => {
    expect(
      getProfileSlug({
        id: "orqbhkjfs6re",
        displayName: "Alex García",
        username: "alex91",
        avatarUrl: null,
        organizerVerified: true,
      }),
    ).toBe("alex91");
  });

  it("falls back to a sanitized displayName for the new owner shape", () => {
    expect(
      getProfileSlug({
        id: "orqbhkjfs6re",
        displayName: "Alex García",
        username: "",
        avatarUrl: null,
        organizerVerified: false,
      }),
    ).toBe("alex-garcia");
  });

  it("returns empty string when the new owner shape has unsafe username + unsafe displayName", () => {
    // UUID-like username + special-char displayName → no safe slug.
    expect(
      getProfileSlug({
        id: "orqbhkjfs6re",
        displayName: "!!!",
        username: "550e8400-e29b-41d4-a716-446655440000",
        avatarUrl: null,
        organizerVerified: false,
      }),
    ).toBe("");
  });

  it("returns empty string when the new owner shape has a null username and empty displayName", () => {
    expect(
      getProfileSlug({
        id: "orqbhkjfs6re",
        displayName: null,
        username: null,
        avatarUrl: null,
        organizerVerified: false,
      }),
    ).toBe("");
  });
});

import { describe, it, expect } from "vitest";
import {
  parseAuthResponse,
  parseAuthUser,
  parseAuthError,
} from "../lib/validation/auth";

describe("Auth validation edge cases", () => {
  it("parseAuthUser accepts optional displayName and avatarUrl", () => {
    const result = parseAuthUser({
      id: "1",
      email: "a@b.com",
      displayName: "Test",
      avatarUrl: "https://example.com/avatar.jpg",
    });
    expect(result?.displayName).toBe("Test");
    expect(result?.avatarUrl).toBe("https://example.com/avatar.jpg");
  });

  it("parseAuthUser accepts null displayName and avatarUrl", () => {
    const result = parseAuthUser({
      id: "1",
      email: "a@b.com",
      displayName: null,
      avatarUrl: null,
    });
    expect(result).not.toBeNull();
    expect(result?.displayName).toBeNull();
  });

  it("parseAuthError extracts error with optional message", () => {
    const code = parseAuthError({
      error: "rate-limited",
      message: "Too many requests",
    });
    expect(code).toBe("rate-limited");
  });

  it("parseAuthResponse rejects missing token", () => {
    const result = parseAuthResponse({
      user: { id: "1", email: "a@b.com" },
      expiresAt: "2026-03-01T00:00:00Z",
    });
    expect(result).toBeNull();
  });

  it("parseAuthResponse rejects invalid email", () => {
    const result = parseAuthResponse({
      user: { id: "1", email: "not-an-email" },
      token: "tok",
      expiresAt: "2026-03-01T00:00:00Z",
    });
    expect(result).toBeNull();
  });
});

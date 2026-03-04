import { describe, it, expect } from "vitest";
import {
  parseAuthResponse,
  parseAuthUser,
  parseAuthError,
} from "../lib/validation/auth";

describe("lib/validation/auth", () => {
  describe("parseAuthResponse", () => {
    it("parses valid auth response", () => {
      const input = {
        user: { id: "1", email: "a@b.com", displayName: "A", avatarUrl: null },
        token: "jwt-token",
        expiresAt: "2026-03-01T00:00:00Z",
      };
      const result = parseAuthResponse(input);
      expect(result).not.toBeNull();
      expect(result?.user.email).toBe("a@b.com");
      expect(result?.token).toBe("jwt-token");
    });

    it("parses response with requiresVerification", () => {
      const input = {
        user: { id: "1", email: "a@b.com" },
        token: "tok",
        expiresAt: "2026-03-01T00:00:00Z",
        requiresVerification: true,
      };
      const result = parseAuthResponse(input);
      expect(result?.requiresVerification).toBe(true);
    });

    it("returns null for invalid data", () => {
      expect(parseAuthResponse(null)).toBeNull();
      expect(parseAuthResponse({})).toBeNull();
      expect(parseAuthResponse("string")).toBeNull();
    });
  });

  describe("parseAuthUser", () => {
    it("parses valid user", () => {
      const result = parseAuthUser({ id: "1", email: "a@b.com" });
      expect(result).not.toBeNull();
      expect(result?.id).toBe("1");
    });

    it("returns null for missing email", () => {
      expect(parseAuthUser({ id: "1" })).toBeNull();
    });
  });

  describe("parseAuthError", () => {
    it("parses error code", () => {
      expect(parseAuthError({ error: "email-taken" })).toBe("email-taken");
    });

    it("returns null for invalid input", () => {
      expect(parseAuthError(null)).toBeNull();
      expect(parseAuthError(42)).toBeNull();
    });
  });
});

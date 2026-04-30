import { describe, it, expect } from "vitest";
import {
  parseAuthResponse,
  parseAuthUser,
  parseAuthError,
  parseAuthMessageResponse,
} from "../lib/validation/auth";

describe("lib/validation/auth", () => {
  describe("parseAuthResponse", () => {
    it("parses valid auth response matching backend AuthResponseDTO", () => {
      const input = {
        accessToken: "jwt-token",
        tokenType: "Bearer",
        expiresAt: "2026-03-01T00:00:00Z",
        user: {
          id: "550e8400-e29b-41d4-a716-446655440001",
          email: "a@b.com",
          name: "Alice",
          role: "USER",
          emailVerified: true,
        },
      };
      const result = parseAuthResponse(input);
      expect(result).not.toBeNull();
      expect(result?.user.email).toBe("a@b.com");
      expect(result?.accessToken).toBe("jwt-token");
      expect(result?.user.role).toBe("USER");
    });

    it("parses response with unverified email", () => {
      const input = {
        accessToken: "tok",
        tokenType: "Bearer",
        expiresAt: "2026-03-01T00:00:00Z",
        user: {
          id: "550e8400-e29b-41d4-a716-446655440002",
          email: "b@c.com",
          name: "Bob",
          role: "ADMIN",
          emailVerified: false,
        },
      };
      const result = parseAuthResponse(input);
      expect(result?.user.emailVerified).toBe(false);
      expect(result?.user.role).toBe("ADMIN");
    });

    it("returns null for invalid data", () => {
      expect(parseAuthResponse(null)).toBeNull();
      expect(parseAuthResponse({})).toBeNull();
      expect(parseAuthResponse("string")).toBeNull();
    });
  });

  describe("parseAuthUser (AuthenticatedUserDTO)", () => {
    it("parses valid backend user DTO", () => {
      const result = parseAuthUser({
        id: "550e8400-e29b-41d4-a716-446655440001",
        email: "a@b.com",
        name: "Alice",
        role: "USER",
        emailVerified: true,
      });
      expect(result).not.toBeNull();
      expect(result?.id).toBe("550e8400-e29b-41d4-a716-446655440001");
      expect(result?.name).toBe("Alice");
    });

    it("returns null for missing required fields", () => {
      expect(parseAuthUser({ id: 1 })).toBeNull();
      expect(parseAuthUser({ id: 1, email: "a@b.com" })).toBeNull();
    });
  });

  describe("parseAuthMessageResponse", () => {
    it("parses message response", () => {
      const result = parseAuthMessageResponse({ message: "Email sent" });
      expect(result).not.toBeNull();
      expect(result?.message).toBe("Email sent");
    });

    it("returns null for invalid data", () => {
      expect(parseAuthMessageResponse(null)).toBeNull();
      expect(parseAuthMessageResponse({})).toBeNull();
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

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fetchWrapper from "../lib/api/fetch-wrapper";
import {
  loginExternal,
  registerExternal,
  getMeExternal,
  forgotPasswordExternal,
  resetPasswordExternal,
  confirmEmailExternal,
  resendVerificationExternal,
} from "../lib/api/auth-external";

vi.mock("../lib/api/fetch-wrapper", () => ({
  fetchWithHmac: vi.fn(),
}));

const mockFetchWithHmac = vi.mocked(fetchWrapper.fetchWithHmac);

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("auth-external", () => {
  describe("loginExternal", () => {
    it("returns parsed AuthResponseDTO on success", async () => {
      mockFetchWithHmac.mockResolvedValue(
        jsonResponse({
          accessToken: "tok",
          tokenType: "Bearer",
          expiresAt: "2026-12-01T00:00:00Z",
          user: {
            id: 1,
            email: "a@b.com",
            name: "Alice",
            role: "USER",
            emailVerified: true,
          },
        })
      );

      const result = await loginExternal("a@b.com", "pass");
      expect(result.status).toBe(200);
      expect(result.data?.accessToken).toBe("tok");
      expect(result.error).toBeNull();
    });

    it("passes skipBodySigning: true", async () => {
      mockFetchWithHmac.mockResolvedValue(
        jsonResponse({
          accessToken: "t",
          tokenType: "Bearer",
          expiresAt: "2026-12-01T00:00:00Z",
          user: {
            id: 1,
            email: "a@b.com",
            name: "A",
            role: "USER",
            emailVerified: true,
          },
        })
      );

      await loginExternal("a@b.com", "pass");

      const [, options] = mockFetchWithHmac.mock.calls[0];
      expect(options).toHaveProperty("skipBodySigning", true);
    });

    it("returns error code on non-ok response", async () => {
      mockFetchWithHmac.mockResolvedValue(
        jsonResponse({ error: "email-not-verified" }, 400)
      );

      const result = await loginExternal("a@b.com", "pass");
      expect(result.status).toBe(400);
      expect(result.error).toBe("email-not-verified");
      expect(result.data).toBeNull();
    });

    it("returns network-error on exception", async () => {
      mockFetchWithHmac.mockRejectedValue(new Error("Connection refused"));

      const result = await loginExternal("a@b.com", "pass");
      expect(result.error).toBe("network-error");
      expect(result.status).toBe(500);
    });
  });

  describe("registerExternal", () => {
    it("returns parsed message on success", async () => {
      mockFetchWithHmac.mockResolvedValue(
        jsonResponse({ message: "User registered. Please verify your email." })
      );

      const result = await registerExternal("a@b.com", "pass", "Alice");
      expect(result.status).toBe(200);
      expect(result.data?.message).toContain("registered");
      expect(result.error).toBeNull();
    });

    it("passes skipBodySigning: true", async () => {
      mockFetchWithHmac.mockResolvedValue(
        jsonResponse({ message: "ok" })
      );

      await registerExternal("a@b.com", "pass", "Alice");

      const [, options] = mockFetchWithHmac.mock.calls[0];
      expect(options).toHaveProperty("skipBodySigning", true);
    });

    it("returns error on duplicate email", async () => {
      mockFetchWithHmac.mockResolvedValue(
        jsonResponse({ error: "email-taken" }, 409)
      );

      const result = await registerExternal("dup@b.com", "pass", "Bob");
      expect(result.error).toBe("email-taken");
    });
  });

  describe("getMeExternal", () => {
    it("returns user DTO on success", async () => {
      mockFetchWithHmac.mockResolvedValue(
        jsonResponse({
          id: 1,
          email: "a@b.com",
          name: "Alice",
          role: "USER",
          emailVerified: true,
        })
      );

      const result = await getMeExternal("bearer-token");
      expect(result).not.toBeNull();
      expect(result?.email).toBe("a@b.com");
    });

    it("sends Authorization header", async () => {
      mockFetchWithHmac.mockResolvedValue(
        jsonResponse({
          id: 1,
          email: "a@b.com",
          name: "A",
          role: "USER",
          emailVerified: true,
        })
      );

      await getMeExternal("my-token");

      const [, options] = mockFetchWithHmac.mock.calls[0];
      const headers = options?.headers as Record<string, string>;
      expect(headers.Authorization).toBe("Bearer my-token");
    });

    it("returns null on non-ok response", async () => {
      mockFetchWithHmac.mockResolvedValue(
        jsonResponse({}, 401)
      );

      expect(await getMeExternal("expired")).toBeNull();
    });

    it("returns null on network error", async () => {
      mockFetchWithHmac.mockRejectedValue(new Error("timeout"));

      expect(await getMeExternal("tok")).toBeNull();
    });
  });

  describe("forgotPasswordExternal", () => {
    it("returns message on success", async () => {
      mockFetchWithHmac.mockResolvedValue(
        jsonResponse({ message: "Reset link sent" })
      );

      const result = await forgotPasswordExternal("a@b.com");
      expect(result.data?.message).toBe("Reset link sent");
      expect(result.error).toBeNull();
    });

    it("passes skipBodySigning: true", async () => {
      mockFetchWithHmac.mockResolvedValue(jsonResponse({ message: "ok" }));
      await forgotPasswordExternal("a@b.com");
      const [, options] = mockFetchWithHmac.mock.calls[0];
      expect(options).toHaveProperty("skipBodySigning", true);
    });
  });

  describe("resetPasswordExternal", () => {
    it("returns message on success", async () => {
      mockFetchWithHmac.mockResolvedValue(
        jsonResponse({ message: "Password reset" })
      );

      const result = await resetPasswordExternal("tok", "newPass1!");
      expect(result.data?.message).toBe("Password reset");
    });

    it("passes skipBodySigning: true", async () => {
      mockFetchWithHmac.mockResolvedValue(jsonResponse({ message: "ok" }));
      await resetPasswordExternal("tok", "newPass1!");
      const [, options] = mockFetchWithHmac.mock.calls[0];
      expect(options).toHaveProperty("skipBodySigning", true);
    });
  });

  describe("confirmEmailExternal", () => {
    it("returns message on success", async () => {
      mockFetchWithHmac.mockResolvedValue(
        jsonResponse({ message: "Email confirmed" })
      );

      const result = await confirmEmailExternal("verify-tok");
      expect(result.data?.message).toBe("Email confirmed");
    });

    it("passes token as query parameter", async () => {
      mockFetchWithHmac.mockResolvedValue(jsonResponse({ message: "ok" }));
      await confirmEmailExternal("my-token");
      const [url] = mockFetchWithHmac.mock.calls[0];
      expect(url).toContain("token=my-token");
    });

    it("uses GET (no method override)", async () => {
      mockFetchWithHmac.mockResolvedValue(jsonResponse({ message: "ok" }));
      await confirmEmailExternal("tok");
      const [, options] = mockFetchWithHmac.mock.calls[0];
      expect(options?.method).toBeUndefined();
    });
  });

  describe("resendVerificationExternal", () => {
    it("returns message on success", async () => {
      mockFetchWithHmac.mockResolvedValue(
        jsonResponse({ message: "Verification email resent" })
      );

      const result = await resendVerificationExternal("a@b.com");
      expect(result.data?.message).toBe("Verification email resent");
    });

    it("passes skipBodySigning: true", async () => {
      mockFetchWithHmac.mockResolvedValue(jsonResponse({ message: "ok" }));
      await resendVerificationExternal("a@b.com");
      const [, options] = mockFetchWithHmac.mock.calls[0];
      expect(options).toHaveProperty("skipBodySigning", true);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@lib/auth/logto", () => ({
  exchangeAuthorizationCode: vi.fn().mockResolvedValue({ id_token: "id-token" }),
  getLogtoConfig: vi.fn().mockReturnValue({}),
  getRequestOrigin: vi.fn().mockReturnValue("https://www.esdeveniments.cat"),
  sanitizeReturnTo: vi.fn((value: string | null | undefined) =>
    typeof value === "string" && value.startsWith("/") ? value : null,
  ),
  verifyIdToken: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@utils/auth-cookies", () => ({
  clearFlowCookies: vi.fn(),
  readFlowCookies: vi.fn().mockReturnValue({
    state: "state-123",
    codeVerifier: "verifier-123",
    nonce: "nonce-123",
    returnTo: "/publica",
  }),
  setTokenCookies: vi.fn(),
}));

import { GET } from "../app/api/auth/callback/route";

describe("GET /api/auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds the one-shot auth_success marker to the success redirect", async () => {
    const request = new NextRequest(
      "https://www.esdeveniments.cat/api/auth/callback?code=abc&state=state-123",
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/publica");
    expect(location.searchParams.get("auth_success")).toBe("1");
  });

  it("still sets auth_error, not auth_success, when the state check fails", async () => {
    const request = new NextRequest(
      "https://www.esdeveniments.cat/api/auth/callback?code=abc&state=wrong-state",
    );

    const response = await GET(request);

    const location = new URL(response.headers.get("location")!);
    expect(location.searchParams.get("auth_error")).toBe("state");
    expect(location.searchParams.get("auth_success")).toBeNull();
  });
});

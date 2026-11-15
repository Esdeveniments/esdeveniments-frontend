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

const flow = {
  state: "state-123",
  codeVerifier: "verifier-123",
  nonce: "nonce-123",
  returnTo: "/publica",
};
vi.mock("@utils/auth-cookies", () => ({
  clearFlowCookies: vi.fn(),
  readFlowCookies: vi.fn(() => flow),
  setTokenCookies: vi.fn(),
}));

const getAuthenticatedUserExternal = vi.fn();
vi.mock("@lib/api/users-external", () => ({
  getAuthenticatedUserExternal: (token: string, options: unknown) =>
    getAuthenticatedUserExternal(token, options),
}));

import { GET } from "../app/api/auth/callback/route";

const callback = () =>
  GET(
    new NextRequest(
      "https://www.esdeveniments.cat/api/auth/callback?code=abc&state=state-123",
    ),
  );
const landing = async () => {
  const location = new URL((await callback()).headers.get("location")!);
  location.searchParams.delete("auth_success");
  return `${location.pathname}${location.search}`;
};

describe("GET /api/auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flow.returnTo = "/publica";
    getAuthenticatedUserExternal.mockResolvedValue({ profileCompleted: true });
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

  it("sends an account that hasn't finished onboarding to the profile form, then back", async () => {
    getAuthenticatedUserExternal.mockResolvedValue({ profileCompleted: false });
    flow.returnTo = "/en/publica?resume=1";

    expect(await landing()).toBe(
      `/en/perfil/edita?redirect=${encodeURIComponent("/publica?resume=1")}`,
    );
  });

  it("keeps the default locale unprefixed on the way to onboarding", async () => {
    getAuthenticatedUserExternal.mockResolvedValue({ profileCompleted: false });

    expect(await landing()).toBe(`/perfil/edita?redirect=${encodeURIComponent("/publica")}`);
  });

  it("returns a completed profile straight to where it started", async () => {
    flow.returnTo = "/en/publica?resume=1";

    expect(await landing()).toBe("/en/publica?resume=1");
  });

  it("skips onboarding instead of blocking the login when the backend fails", async () => {
    getAuthenticatedUserExternal.mockRejectedValue(Object.assign(new Error("down"), { status: 503 }));

    expect(await landing()).toBe("/publica");
  });

  it("caps the onboarding check well below the default backend timeout", async () => {
    await callback();

    const [, options] = getAuthenticatedUserExternal.mock.calls[0];
    expect(options.timeout).toBeLessThanOrEqual(3_000);
  });

  it("doesn't wrap onboarding in itself", async () => {
    getAuthenticatedUserExternal.mockResolvedValue({ profileCompleted: false });
    flow.returnTo = "/es/perfil/edita?redirect=%2Fpublica";

    expect(await landing()).toBe("/es/perfil/edita?redirect=%2Fpublica");
  });
});

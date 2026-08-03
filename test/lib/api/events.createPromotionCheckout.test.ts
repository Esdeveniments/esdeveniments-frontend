import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetValidAccessToken = vi.fn();
const mockGetApiUrl = vi.fn();
const mockIsApiUrlConfigured = vi.fn();
const mockFetchWithHmac = vi.fn();

vi.mock("@utils/auth-cookies", () => ({
  getAccessTokenFromCookies: vi.fn(),
  getValidAccessToken: () => mockGetValidAccessToken(),
}));

vi.mock("@utils/api-helpers", () => ({
  getInternalApiUrl: vi.fn(),
  buildEventsQuery: vi.fn(),
  getVercelProtectionBypassHeaders: () => ({}),
  getApiUrl: () => mockGetApiUrl(),
  isApiUrlConfigured: () => mockIsApiUrlConfigured(),
}));

vi.mock("../../../lib/api/fetch-wrapper", () => ({
  fetchWithHmac: (url: string, options: RequestInit) =>
    mockFetchWithHmac(url, options),
}));

import { createPromotionCheckout } from "../../../lib/api/events";

describe("createPromotionCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsApiUrlConfigured.mockReturnValue(true);
    mockGetApiUrl.mockReturnValue("https://api.test");
    mockGetValidAccessToken.mockResolvedValue("test-token");
  });

  it("POSTs to /events/{id}/promotions/checkout with skipBodySigning and returns the url", async () => {
    mockFetchWithHmac.mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://checkout.stripe.com/session123" }),
    });

    const result = await createPromotionCheckout(
      "event-uuid-1",
      "https://www.esdeveniments.cat/e/my-event/promote/success",
      "https://www.esdeveniments.cat/e/my-event/promote/cancel",
    );

    expect(mockFetchWithHmac).toHaveBeenCalledWith(
      "https://api.test/events/event-uuid-1/promotions/checkout",
      expect.objectContaining({
        method: "POST",
        skipBodySigning: true,
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
    const [, callOptions] = mockFetchWithHmac.mock.calls[0];
    expect(JSON.parse(callOptions.body as string)).toEqual({
      successUrl: "https://www.esdeveniments.cat/e/my-event/promote/success",
      cancelUrl: "https://www.esdeveniments.cat/e/my-event/promote/cancel",
    });
    expect(result).toEqual({ url: "https://checkout.stripe.com/session123" });
  });

  it("throws when the backend responds with a non-2xx status", async () => {
    mockFetchWithHmac.mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "Not found",
    });

    await expect(
      createPromotionCheckout("event-uuid-1", "https://x/success", "https://x/cancel"),
    ).rejects.toThrow(/404/);
  });

  it("attaches the backend's HTTP status to the thrown error, so a 401 the backend itself rejects is classified the same as a locally-expired token", async () => {
    mockFetchWithHmac.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Token expired",
    });

    await expect(
      createPromotionCheckout("event-uuid-1", "https://x/success", "https://x/cancel"),
    ).rejects.toMatchObject({ status: 401 });
  });

  it("throws when no valid access token is available", async () => {
    mockGetValidAccessToken.mockResolvedValue(null);

    await expect(
      createPromotionCheckout("event-uuid-1", "https://x/success", "https://x/cancel"),
    ).rejects.toThrow("Authentication required");
  });
});

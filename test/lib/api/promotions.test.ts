import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fetchWrapper from "@lib/api/fetch-wrapper";
import * as authCookies from "@utils/auth-cookies";
import * as events from "@lib/api/events";
import * as apiHelpers from "@utils/api-helpers";
import {
  buildPromotedEventsQuery,
  createPromotionCheckout,
  getPromotionOptions,
  getPromotionStatus,
  isStripeCheckoutUrl,
} from "@lib/api/promotions";
import { parseEventSummaryList } from "@lib/validation/event";

vi.mock("@lib/api/fetch-wrapper", () => ({ fetchWithHmac: vi.fn() }));
vi.mock("@utils/auth-cookies", () => ({
  getAccessTokenFromCookies: vi.fn().mockResolvedValue("cookie-token"),
}));
vi.mock("@utils/api-helpers", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/api-helpers")>()),
  getApiUrl: () => "https://api.example.com/api",
  isApiUrlConfigured: vi.fn(() => true),
}));
vi.mock("@lib/api/events", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    apiUrl: "https://api.example.com/api",
    authToken: "token",
  }),
}));

const mockFetch = vi.mocked(fetchWrapper.fetchWithHmac);
const orderId = "6d1ebd26-7ef8-4fe2-bec3-3e855080ce59";
const eventId = "74beae63-5c27-4590-94c0-368dc2657d52";
const options = {
  options: [
    {
      id: "opt-city-7",
      scope: "CITY",
      durationDays: 7,
      amountMinor: 1500,
      currency: "EUR",
      taxIncluded: true,
      available: true,
      unavailableReason: null,
    },
  ],
  canPurchase: false,
  unavailableReason: null,
  cityId: null,
  regionId: null,
  provinceId: null,
  eventEndsAt: "2026-11-01T23:00:00Z",
};
const status = {
  orderId: null,
  paymentStatus: "NONE",
  promotionStatus: "NONE",
  scope: null,
  startsAt: null,
  endsAt: null,
  canPurchase: true,
  checkoutUrl: null,
};

const jsonResponse = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as Response;

describe("buildPromotedEventsQuery", () => {
  it("sends no territorial id for Catalonia", () => {
    expect(buildPromotedEventsQuery({ placement: "CATALONIA" })).toBe(
      "placement=CATALONIA&size=8",
    );
  });

  it("sends only the id that matches the placement", () => {
    expect(buildPromotedEventsQuery({ placement: "CITY", cityId: 3 })).toBe(
      "placement=CITY&size=8&cityId=3",
    );
    expect(buildPromotedEventsQuery({ placement: "REGION", regionId: 12 })).toBe(
      "placement=REGION&size=8&regionId=12",
    );
    expect(buildPromotedEventsQuery({ placement: "PROVINCE", provinceId: 8 })).toBe(
      "placement=PROVINCE&size=8&provinceId=8",
    );
  });
});

describe("isStripeCheckoutUrl", () => {
  it("accepts only https Stripe Checkout URLs", () => {
    expect(isStripeCheckoutUrl("https://checkout.stripe.com/c/pay/cs_1")).toBe(true);
    expect(isStripeCheckoutUrl("http://checkout.stripe.com/c/pay/cs_1")).toBe(false);
    expect(isStripeCheckoutUrl("https://evil.example.com/checkout")).toBe(false);
    expect(isStripeCheckoutUrl(null)).toBe(false);
  });
});

describe("createPromotionCheckout", () => {
  beforeEach(() => mockFetch.mockReset());

  it("posts the option with the caller's Idempotency-Key to the event UUID", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(200, { orderId, url: "https://checkout.stripe.com/x" }),
    );

    const result = await createPromotionCheckout(eventId, "city-7d", "key-1");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(`https://api.example.com/api/events/${eventId}/promotions/checkout`);
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>)["Idempotency-Key"]).toBe("key-1");
    expect(init?.body).toBe(JSON.stringify({ optionId: "city-7d" }));
    expect(result).toEqual({
      ok: true,
      data: { orderId, url: "https://checkout.stripe.com/x" },
    });
  });

  it("never sends a non-UUID event id to the backend", async () => {
    expect(await createPromotionCheckout("..", "city-7d", "key-1")).toEqual({ ok: false, code: "UNKNOWN" });
    expect(await getPromotionStatus("../users/me")).toEqual({ ok: false, code: "UNKNOWN" });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns the backend error code instead of throwing", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(409, { status: 409, code: "PROMOTION_ALREADY_ACTIVE" }),
    );

    const result = await createPromotionCheckout(eventId, "city-7d", "key-1");

    expect(result).toEqual({ ok: false, code: "PROMOTION_ALREADY_ACTIVE" });
  });

  it("maps a bodyless Spring Security 401 to AUTHENTICATION_REQUIRED", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.reject(new Error("no body")),
    } as Response);

    const result = await createPromotionCheckout(eventId, "city-7d", "key-1");

    expect(result).toEqual({ ok: false, code: "AUTHENTICATION_REQUIRED" });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("renews a rejected token once and retries with the same Idempotency-Key", async () => {
    vi.mocked(events.requireAuth)
      .mockResolvedValueOnce({ apiUrl: "https://api.example.com/api", authToken: "stale" })
      .mockResolvedValueOnce({ apiUrl: "https://api.example.com/api", authToken: "renewed" });
    mockFetch
      .mockResolvedValueOnce(jsonResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse(200, { orderId, url: "https://checkout.stripe.com/x" }));

    const result = await createPromotionCheckout(eventId, "city-7d", "key-1");

    expect(result.ok).toBe(true);
    expect(vi.mocked(events.requireAuth)).toHaveBeenLastCalledWith({ forceRefresh: true });
    const headers = mockFetch.mock.calls[1][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer renewed");
    expect(headers["Idempotency-Key"]).toBe("key-1");
  });
});

describe("promotion reads during a server render", () => {
  beforeEach(() => mockFetch.mockReset());

  it("use the cookie token and never refresh it", async () => {
    vi.mocked(events.requireAuth).mockClear();
    mockFetch.mockResolvedValue(jsonResponse(200, options));

    await getPromotionOptions(eventId);

    const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer cookie-token");
    expect(vi.mocked(events.requireAuth)).not.toHaveBeenCalled();
  });

  it("report AUTHENTICATION_REQUIRED without a cookie token", async () => {
    vi.mocked(authCookies.getAccessTokenFromCookies).mockResolvedValueOnce(null);

    expect(await getPromotionOptions(eventId)).toEqual({
      ok: false,
      code: "AUTHENTICATION_REQUIRED",
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("report a failed result instead of throwing without an API URL", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(apiHelpers.isApiUrlConfigured).mockReturnValueOnce(false);

    expect(await getPromotionOptions(eventId)).toEqual({ ok: false, code: "UNKNOWN" });
    expect(mockFetch).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("turn a malformed response into a failed result instead of throwing", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError("Unexpected token <")),
    } as Response);

    expect(await getPromotionOptions(eventId)).toEqual({ ok: false, code: "UNKNOWN" });
    errorSpy.mockRestore();
  });
});

describe("promotion response validation", () => {
  beforeEach(() => mockFetch.mockReset());

  it("accepts complete options and an empty promotion status", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(200, options));
    expect(await getPromotionOptions(eventId)).toEqual({ ok: true, data: options });
    mockFetch.mockResolvedValueOnce(jsonResponse(200, status));
    expect(await getPromotionStatus(eventId)).toEqual({ ok: true, data: status });
  });

  it.each([{}, null, { ...options, options: null }, { ...options, options: [{ ...options.options[0], currency: "eur" }] }, { ...options, eventEndsAt: "bad" }])(
    "rejects schema-invalid options: %j",
    async (body) => {
      mockFetch.mockResolvedValue(jsonResponse(200, body));
      expect(await getPromotionOptions(eventId)).toEqual({ ok: false, code: "UNKNOWN" });
    },
  );

  it.each([
    { ...status, paymentStatus: "UNKNOWN_STATUS" },
    { ...status, promotionStatus: "ACTIVE", endsAt: "not-a-date" },
    { ...status, orderId: "not-a-uuid" },
  ])("rejects invalid status fields before rendering: %j", async (body) => {
    mockFetch.mockResolvedValue(jsonResponse(200, body));
    expect(await getPromotionStatus(eventId)).toEqual({ ok: false, code: "UNKNOWN" });
  });

  it.each([
    { orderId, url: "not-a-url" },
    { orderId: "not-a-uuid", url: "https://checkout.stripe.com/x" },
  ])("rejects invalid checkout responses: %j", async (body) => {
    mockFetch.mockResolvedValue(jsonResponse(200, body));
    expect(await createPromotionCheckout(eventId, "city-7d", "key-1")).toEqual({
      ok: false,
      code: "UNKNOWN",
    });
  });

  it("returns UNKNOWN for non-authentication checkout setup errors", async () => {
    vi.mocked(events.requireAuth).mockRejectedValueOnce(new Error("Missing API config"));
    expect(await createPromotionCheckout(eventId, "city-7d", "key-1")).toEqual({
      ok: false,
      code: "UNKNOWN",
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("parseEventSummaryList", () => {
  const event = {
    id: "1",
    hash: "h",
    slug: "s",
    title: "T",
    url: null,
    description: "",
    imageUrl: null,
    startDate: "2026-11-01",
    startTime: null,
    endDate: "2026-11-01",
    endTime: null,
    location: "L",
    visits: 0,
    origin: "MANUAL",
    categories: [],
    isPromoted: true,
  };

  it("keeps valid events and drops invalid ones", () => {
    expect(parseEventSummaryList([event, { slug: "broken" }]).map((e) => e.slug)).toEqual([
      "s",
    ]);
  });

  it("returns [] for a non-array payload", () => {
    expect(parseEventSummaryList({ content: [event] })).toEqual([]);
  });
});

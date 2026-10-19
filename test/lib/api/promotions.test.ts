import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fetchWrapper from "@lib/api/fetch-wrapper";
import {
  buildPromotedEventsQuery,
  createPromotionCheckout,
  isStripeCheckoutUrl,
} from "@lib/api/promotions";

vi.mock("@lib/api/fetch-wrapper", () => ({ fetchWithHmac: vi.fn() }));
vi.mock("@lib/api/events", () => ({
  requireAuth: vi.fn().mockResolvedValue({
    apiUrl: "https://api.example.com/api",
    authToken: "token",
  }),
}));

const mockFetch = vi.mocked(fetchWrapper.fetchWithHmac);

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
    expect(buildPromotedEventsQuery({ placement: "REGION", regionId: 12 })).toBe(
      "placement=REGION&size=8&regionId=12",
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
      jsonResponse(200, { orderId: "o1", url: "https://checkout.stripe.com/x" }),
    );

    const result = await createPromotionCheckout("uuid-1", "city-7d", "key-1");

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.example.com/api/events/uuid-1/promotions/checkout");
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>)["Idempotency-Key"]).toBe("key-1");
    expect(init?.body).toBe(JSON.stringify({ optionId: "city-7d" }));
    expect(result).toEqual({
      ok: true,
      data: { orderId: "o1", url: "https://checkout.stripe.com/x" },
    });
  });

  it("returns the backend error code instead of throwing", async () => {
    mockFetch.mockResolvedValue(
      jsonResponse(409, { status: 409, code: "PROMOTION_ALREADY_ACTIVE" }),
    );

    const result = await createPromotionCheckout("uuid-1", "city-7d", "key-1");

    expect(result).toEqual({ ok: false, code: "PROMOTION_ALREADY_ACTIVE" });
  });

  it("maps a bodyless Spring Security 401 to AUTHENTICATION_REQUIRED", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.reject(new Error("no body")),
    } as Response);

    const result = await createPromotionCheckout("uuid-1", "city-7d", "key-1");

    expect(result).toEqual({ ok: false, code: "AUTHENTICATION_REQUIRED" });
  });
});

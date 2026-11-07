/**
 * Tests for sponsor checkout occupancy validation.
 *
 * Ensures the checkout API rejects requests for places that already
 * have an active or pending sponsor. This is the server-side guard
 * that prevents double-booking even if client-side UI is bypassed.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock getOccupiedPlaceStatus before importing the route
const mockGetOccupiedPlaceStatus = vi.fn<() => Promise<Map<string, number>>>();

vi.mock("lib/db/sponsors", () => ({
  getOccupiedPlaceStatus: (...args: unknown[]) =>
    mockGetOccupiedPlaceStatus(...(args as [])),
}));

// Mock Stripe request to prevent real API calls
vi.mock("lib/stripe/api", () => ({
  stripeRequest: vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        id: "cs_test_123",
        url: "https://checkout.stripe.com/test",
      }),
  }),
}));

// Mock route-validation
vi.mock("utils/route-validation", () => ({
  isValidPlace: (place: string) => /^[a-z0-9-]+$/.test(place),
}));

// Mock sentry
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// Mock config
vi.mock("config/index", () => ({
  getSiteUrlFromRequest: () => "https://www.esdeveniments.cat",
}));

import { POST } from "app/api/sponsors/checkout/route";
import { stripeRequest } from "lib/stripe/api";
import { NextRequest } from "next/server";

function createCheckoutRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(
    "https://www.esdeveniments.cat/api/sponsors/checkout",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-visitor-id": "test-visitor-123",
      },
      body: JSON.stringify(body),
    },
  );
}

const validBody = {
  duration: "7days",
  locale: "ca",
  place: "barcelona",
  placeName: "Barcelona",
  geoScope: "town",
};

describe("Sponsor Checkout Occupancy Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects checkout for an occupied place with 409", async () => {
    mockGetOccupiedPlaceStatus.mockResolvedValue(new Map([["barcelona", 5]]));

    const req = createCheckoutRequest(validBody);
    const res = await POST(req);

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("place_occupied");
    expect(json.daysLeft).toBe(5);
  });

  it("allows checkout for an unoccupied place", async () => {
    mockGetOccupiedPlaceStatus.mockResolvedValue(
      new Map([["mataro", 3]]), // Different place is occupied
    );

    const req = createCheckoutRequest(validBody);
    const res = await POST(req);

    // Should proceed to Stripe (200 with session URL)
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBeDefined();
    expect(json.sessionId).toBeDefined();
  });

  it("allows checkout when no places are occupied", async () => {
    mockGetOccupiedPlaceStatus.mockResolvedValue(new Map());

    const req = createCheckoutRequest(validBody);
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBeDefined();
  });

  it("rejects checkout for occupied country-level place", async () => {
    mockGetOccupiedPlaceStatus.mockResolvedValue(new Map([["catalunya", 10]]));

    const req = createCheckoutRequest({
      ...validBody,
      place: "catalunya",
      placeName: "Catalunya",
      geoScope: "country",
    });
    const res = await POST(req);

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("place_occupied");
    expect(json.daysLeft).toBe(10);
  });

  it("rejects checkout for occupied region-level place", async () => {
    mockGetOccupiedPlaceStatus.mockResolvedValue(
      new Map([["valles-oriental", 7]]),
    );

    const req = createCheckoutRequest({
      ...validBody,
      place: "valles-oriental",
      placeName: "Vallès Oriental",
      geoScope: "region",
    });
    const res = await POST(req);

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toBe("place_occupied");
    expect(json.daysLeft).toBe(7);
  });

  it("includes daysLeft in the error response", async () => {
    mockGetOccupiedPlaceStatus.mockResolvedValue(new Map([["barcelona", 14]]));

    const req = createCheckoutRequest(validBody);
    const res = await POST(req);

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.daysLeft).toBe(14);
    expect(json.message).toContain("14");
  });
});

describe("Sponsor Checkout Idempotency-Key", () => {
  const mockStripeRequest = vi.mocked(stripeRequest);

  function requestWithKey(key: string): NextRequest {
    return new NextRequest(
      "https://www.esdeveniments.cat/api/sponsors/checkout",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": key,
        },
        body: JSON.stringify(validBody),
      },
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOccupiedPlaceStatus.mockResolvedValue(new Map());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends Stripe identical params when a retry reuses the key", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-07T10:05:00Z"));
    await POST(requestWithKey("key-1"));
    vi.setSystemTime(new Date("2026-11-07T10:20:00Z"));
    await POST(requestWithKey("key-1"));

    const [first, retry] = mockStripeRequest.mock.calls.map(
      ([, init]) => init as { body: URLSearchParams; headers: HeadersInit },
    );
    expect(retry.headers).toEqual({ "Idempotency-Key": "key-1" });
    expect(retry.body.toString()).toBe(first.body.toString());
    const expiresAt = Number(first.body.get("expires_at"));
    expect(expiresAt).toBe(Date.parse("2026-11-07T11:00:00Z") / 1000);
  });

  it("rejects an empty key instead of generating one", async () => {
    const res = await POST(requestWithKey(" "));

    expect(res.status).toBe(400);
    expect(mockStripeRequest).not.toHaveBeenCalled();
  });

  it("returns 409 when Stripe rejects a reused key", async () => {
    mockStripeRequest.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: () =>
        Promise.resolve(
          '{"error":{"type":"idempotency_error","message":"Keys for idempotent requests can only be used with the same parameters"}}',
        ),
    } as Response);

    const res = await POST(requestWithKey("key-2"));

    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain("Idempotency-Key");
  });
});

/**
 * Unit tests for the sponsor webhook handler.
 *
 * Tests the payment_status guard: "paid" and "no_payment_required" should
 * create sponsors, while "unpaid" should be skipped (awaiting async payment).
 *
 * Uses the dev bypass path (STRIPE_WEBHOOK_SKIP_VERIFY=true, no WEBHOOK_SECRET)
 * to avoid signature verification in tests.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import type { StripeWebhookEvent } from "types/sponsor";

// ── Mocks (hoisted) ────────────────────────────────────────────────

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

vi.mock("@lib/stripe", () => ({
  constructEvent: vi.fn(),
  parseAndValidateEvent: vi.fn(),
  updatePaymentIntentMetadata: vi.fn().mockResolvedValue(true),
}));

vi.mock("@lib/db/sponsors", () => ({
  createSponsor: vi.fn().mockResolvedValue("sponsor-uuid-123"),
  findSponsorBySessionId: vi.fn().mockResolvedValue(false),
}));

// ── Imports (after mocks) ──────────────────────────────────────────

import { POST } from "app/api/sponsors/webhook/route";
import { parseAndValidateEvent } from "@lib/stripe";
import { createSponsor, findSponsorBySessionId } from "@lib/db/sponsors";

const mockParseAndValidateEvent = vi.mocked(parseAndValidateEvent);
const mockCreateSponsor = vi.mocked(createSponsor);
const mockFindSponsorBySessionId = vi.mocked(findSponsorBySessionId);

// ── Helpers ────────────────────────────────────────────────────────

function buildCheckoutEvent(
  paymentStatus: string,
  sessionId = `cs_test_${Date.now()}`,
): StripeWebhookEvent {
  return {
    id: `evt_test_${Date.now()}`,
    type: "checkout.session.completed",
    data: {
      object: {
        id: sessionId,
        object: "checkout.session" as const,
        payment_intent: paymentStatus === "paid" ? "pi_test_123" : null,
        payment_status: paymentStatus,
        status: "complete",
        amount_total: paymentStatus === "no_payment_required" ? 0 : 1500,
        currency: "eur",
        customer_details: {
          email: "test@example.com",
          name: "Test User",
        },
        metadata: {
          product: "sponsor_banner",
          duration: "7days",
          duration_days: "7",
          place: "cardedeu",
          place_name: "Cardedeu",
          geo_scope: "town",
        },
      },
    },
  };
}

function createWebhookRequest(payload: string): NextRequest {
  return new NextRequest("http://localhost:3000/api/sponsors/webhook", {
    method: "POST",
    body: payload,
    headers: { "Content-Type": "application/json" },
  });
}

// ── Tests ──────────────────────────────────────────────────────────

describe("Sponsor webhook - payment_status handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindSponsorBySessionId.mockResolvedValue(false);
    mockCreateSponsor.mockResolvedValue("sponsor-uuid-123");

    // Enable dev bypass
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("STRIPE_WEBHOOK_SKIP_VERIFY", "true");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
  });

  it("should create sponsor for payment_status 'paid'", async () => {
    const event = buildCheckoutEvent("paid");
    mockParseAndValidateEvent.mockReturnValue(event);

    const request = createWebhookRequest(JSON.stringify(event));
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockCreateSponsor).toHaveBeenCalledOnce();
    expect(mockCreateSponsor).toHaveBeenCalledWith(
      expect.objectContaining({
        places: ["cardedeu"],
        geoScope: "town",
        amountPaid: 1500,
        currency: "eur",
      }),
    );
  });

  it("should create sponsor for payment_status 'no_payment_required' (100% coupon)", async () => {
    const event = buildCheckoutEvent("no_payment_required");
    mockParseAndValidateEvent.mockReturnValue(event);

    const request = createWebhookRequest(JSON.stringify(event));
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockCreateSponsor).toHaveBeenCalledOnce();
    expect(mockCreateSponsor).toHaveBeenCalledWith(
      expect.objectContaining({
        places: ["cardedeu"],
        amountPaid: 0,
        currency: "eur",
      }),
    );
  });

  it("should skip sponsor creation for payment_status 'unpaid'", async () => {
    const event = buildCheckoutEvent("unpaid");
    mockParseAndValidateEvent.mockReturnValue(event);

    const request = createWebhookRequest(JSON.stringify(event));
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockCreateSponsor).not.toHaveBeenCalled();
  });

  it("should skip non-sponsor checkout events", async () => {
    const event = buildCheckoutEvent("paid");
    event.data.object.metadata.product = "something_else";
    mockParseAndValidateEvent.mockReturnValue(event);

    const request = createWebhookRequest(JSON.stringify(event));
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockCreateSponsor).not.toHaveBeenCalled();
  });

  it("should be idempotent - skip if session already processed", async () => {
    const sessionId = "cs_test_already_exists";
    const event = buildCheckoutEvent("paid", sessionId);
    mockParseAndValidateEvent.mockReturnValue(event);
    mockFindSponsorBySessionId.mockResolvedValue(true);

    const request = createWebhookRequest(JSON.stringify(event));
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockFindSponsorBySessionId).toHaveBeenCalledWith(sessionId);
    expect(mockCreateSponsor).not.toHaveBeenCalled();
  });
});

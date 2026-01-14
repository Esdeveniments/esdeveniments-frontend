import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSiteUrl } from "@config/index";
import { STRIPE_API_VERSION } from "@lib/stripe/api";
import {
  buildLineItemParams,
  buildCustomFieldParams,
  buildMetadataParams,
} from "@lib/stripe/checkout-helpers";
import type {
  SponsorDuration,
  SponsorCheckoutRequest,
  StripeCheckoutSessionResponse,
  GeoScope,
} from "types/sponsor";
import { DURATION_DAYS } from "types/sponsor";

/**
 * Create Stripe Checkout Session using REST API (no SDK needed)
 */
async function createStripeCheckoutSession(
  duration: SponsorDuration,
  locale: string,
  place: string,
  placeName: string,
  geoScope: GeoScope,
  idempotencyKey: string
): Promise<StripeCheckoutSessionResponse> {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

  if (!STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  const baseUrl = getSiteUrl();
  const params = new URLSearchParams();

  // Mode and URLs
  params.append("mode", "payment");
  params.append(
    "success_url",
    `${baseUrl}/patrocina/upload?session_id={CHECKOUT_SESSION_ID}&place=${encodeURIComponent(
      place
    )}&placeName=${encodeURIComponent(placeName)}`
  );
  params.append("cancel_url", `${baseUrl}/patrocina/cancelled`);

  // Compose checkout params from helpers
  buildLineItemParams(params, duration, geoScope, locale);
  buildCustomFieldParams(params, locale);
  buildMetadataParams(params, duration, place, placeName, geoScope);

  // Locale for checkout page (Stripe doesn't support Catalan, use Spanish as fallback)
  const stripeLocale = ["ca", "es"].includes(locale) ? "es" : "en";
  params.append("locale", stripeLocale);

  // Customer creation to get email
  params.append("customer_creation", "always");

  // Statement descriptor - what customer sees on bank statement (max 22 chars)
  params.append(
    "payment_intent_data[statement_descriptor]",
    "ESDEVENIMENTS.CAT"
  );

  // Session expiration - 30 minutes for better UX (default is 24h)
  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60;
  params.append("expires_at", String(expiresAt));

  // AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(
      "https://api.stripe.com/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Stripe-Version": STRIPE_API_VERSION,
          "Idempotency-Key": idempotencyKey,
        },
        body: params.toString(),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Stripe API error:", error);
      throw new Error(`Stripe API error: ${response.status}`);
    }

    const session = (await response.json()) as StripeCheckoutSessionResponse;
    return session;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * POST /api/sponsors/checkout
 * Creates a Stripe Checkout session for sponsor banner purchase
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SponsorCheckoutRequest;
    const {
      duration,
      locale = "ca",
      place,
      placeName,
      geoScope = "town",
    } = body;

    // Validate duration
    if (!duration || !DURATION_DAYS[duration]) {
      return NextResponse.json(
        {
          error:
            "Invalid duration. Must be one of: 3days, 7days, 14days, 30days",
        },
        { status: 400 }
      );
    }

    // Validate place
    if (!place || !placeName) {
      return NextResponse.json(
        { error: "Place selection is required" },
        { status: 400 }
      );
    }

    // Validate geoScope
    if (!["town", "region", "country"].includes(geoScope)) {
      return NextResponse.json(
        { error: "Invalid geoScope. Must be one of: town, region, country" },
        { status: 400 }
      );
    }

    // Generate idempotency key from request params to prevent duplicate sessions
    // Uses visitor_id cookie (set by middleware) + params for deterministic key per user/request
    // Includes geoScope to prevent collisions between different pricing tiers
    const visitorId = request.cookies.get("visitor_id")?.value;
    if (!visitorId) {
      // Middleware should always set visitor_id - log warning if missing
      console.warn("Missing visitor_id cookie for checkout request");
    }
    // Use visitor_id for deterministic idempotency, fall back to IP for stability
    // IP is not ideal but prevents duplicate sessions on network retries
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const userKey = visitorId || `anon-ip-${clientIp}`;
    const idempotencyKey = crypto
      .createHash("sha256")
      .update(`${userKey}-${duration}-${geoScope}-${place}-${placeName}`)
      .digest("hex")
      .slice(0, 32);

    const session = await createStripeCheckoutSession(
      duration,
      locale,
      place,
      placeName,
      geoScope,
      idempotencyKey
    );

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error(
      "Checkout error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

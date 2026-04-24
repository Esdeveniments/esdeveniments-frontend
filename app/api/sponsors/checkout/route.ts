import { NextRequest, NextResponse } from "next/server";
import { captureException } from "@sentry/nextjs";
import { getSiteUrlFromRequest } from "@config/index";
import { stripeRequest } from "@lib/stripe/api";
import {
  buildLineItemParams,
  buildCustomFieldParams,
  buildMetadataParams,
} from "@lib/stripe/checkout-helpers";
import { isValidPlace } from "@utils/route-validation";
import { getOccupiedPlaceStatus } from "@lib/db/sponsors";
import type {
  SponsorDuration,
  SponsorCheckoutRequest,
  StripeCheckoutSessionResponse,
  GeoScope,
} from "types/sponsor";
import { DURATION_DAYS, VALID_GEO_SCOPES } from "types/sponsor";

/**
 * Create Stripe Checkout Session using REST API (no SDK needed)
 */
async function createStripeCheckoutSession(
  duration: SponsorDuration,
  locale: string,
  place: string,
  placeName: string,
  geoScope: GeoScope,
  idempotencyKey: string,
  baseUrl: string,
): Promise<StripeCheckoutSessionResponse> {
  const params = new URLSearchParams();

  // Mode and URLs
  params.append("mode", "payment");
  params.append(
    "success_url",
    `${baseUrl}/patrocina/upload?session_id={CHECKOUT_SESSION_ID}&place=${encodeURIComponent(
      place,
    )}&placeName=${encodeURIComponent(placeName)}`,
  );
  params.append("cancel_url", `${baseUrl}/patrocina/cancelled`);

  // Compose checkout params from helpers
  buildLineItemParams(params, duration, geoScope, locale);
  buildCustomFieldParams(params, locale);
  buildMetadataParams(params, duration, place, placeName, geoScope);

  // Locale for checkout page (Stripe doesn't support Catalan, use Spanish as fallback)
  const stripeLocale = ["ca", "es"].includes(locale) ? "es" : "en";
  params.append("locale", stripeLocale);

  // Allow promotion codes (coupon input on checkout page)
  params.append("allow_promotion_codes", "true");

  // Customer creation to get email
  params.append("customer_creation", "always");

  // Statement descriptor suffix - what customer sees on bank statement after your business name
  // Rules: max 22 chars for full descriptor, suffix typically 10 chars
  // Allowed: alphanumeric, spaces, dashes. NOT allowed: . < > ' "
  // Using suffix (not full descriptor) for card payment compatibility
  params.append(
    "payment_intent_data[statement_descriptor_suffix]",
    "ESDEV-CAT",
  );

  // Session expiration - 30 minutes for better UX (default is 24h)
  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60;
  params.append("expires_at", String(expiresAt));

  const response = await stripeRequest("/checkout/sessions", {
    method: "POST",
    body: params,
    headers: { "Idempotency-Key": idempotencyKey },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Stripe API error:", response.status, errorBody);
    throw new Error(
      `Stripe API error ${response.status}: ${errorBody.slice(0, 500)}`,
    );
  }

  const session = (await response.json()) as StripeCheckoutSessionResponse;
  return session;
}

/**
 * POST /api/sponsors/checkout
 * Creates a Stripe Checkout session for sponsor banner purchase
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SponsorCheckoutRequest;
    const { duration, locale = "ca", place, placeName, geoScope } = body;

    // Validate geoScope (required - no default to prevent silent pricing errors)
    if (!geoScope || !VALID_GEO_SCOPES.includes(geoScope as GeoScope)) {
      return NextResponse.json(
        {
          error: `geoScope is required and must be one of: ${VALID_GEO_SCOPES.join(
            ", ",
          )}`,
        },
        { status: 400 },
      );
    }

    // Validate duration
    if (!duration || !(duration in DURATION_DAYS)) {
      return NextResponse.json(
        {
          error: `Invalid duration. Must be one of: ${Object.keys(DURATION_DAYS).join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Validate place
    if (!place || !placeName) {
      return NextResponse.json(
        { error: "Place selection is required" },
        { status: 400 },
      );
    }

    // Validate place (format + blocklist check for system paths)
    if (!isValidPlace(place)) {
      return NextResponse.json(
        { error: "Invalid place format" },
        { status: 400 },
      );
    }

    // Server-side occupancy check — prevent checkout for already-occupied places
    const occupiedStatus = await getOccupiedPlaceStatus();
    if (occupiedStatus.has(place)) {
      const daysLeft = occupiedStatus.get(place);
      return NextResponse.json(
        {
          error: "place_occupied",
          message: `This place is already occupied for ${daysLeft} more day(s)`,
          daysLeft,
        },
        { status: 409 },
      );
    }

    // Idempotency key: client sends a UUID per click attempt (X-Idempotency-Key header).
    // Per Stripe docs: "We recommend creating a new Session each time your customer
    // attempts to pay" and "we suggest using V4 UUIDs" for idempotency keys.
    //
    // - Double-click / network retry → same UUID → Stripe returns cached session
    // - User navigates back + clicks again → new UUID → new session (correct)
    //
    // Server-side fallback uses visitor_id + timestamp to avoid the old problem
    // where a deterministic key clashed with changing params (expires_at).
    const clientKey = request.headers.get("x-idempotency-key");
    const idempotencyKey =
      clientKey ||
      `${request.headers.get("x-visitor-id") || "anon"}-${Date.now()}`;

    // Get the actual request URL for redirects (important for preview deployments)
    const baseUrl = getSiteUrlFromRequest(request);

    // Safety: In production, redirect URLs MUST use HTTPS.
    // If baseUrl resolved to an internal address (http://0.0.0.0, http://10.x, etc.),
    // that's a misconfiguration — fail early instead of creating a broken Stripe session.
    if (
      process.env.NODE_ENV === "production" &&
      !baseUrl.startsWith("https://")
    ) {
      console.error(
        `[checkout] Resolved baseUrl is not HTTPS in production: ${baseUrl}. ` +
          "Check NEXT_PUBLIC_SITE_URL and proxy headers.",
      );
      captureException(
        new Error(`Checkout baseUrl not HTTPS: ${baseUrl}`),
        { tags: { api: "sponsors-checkout" } },
      );
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    const session = await createStripeCheckoutSession(
      duration,
      locale,
      place,
      placeName,
      geoScope,
      idempotencyKey,
      baseUrl,
    );

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Checkout error:", message);
    captureException(error, {
      tags: { api: "sponsors-checkout" },
    });
    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        // Include Stripe error detail for debugging (no secrets exposed)
        detail: message,
      },
      { status: 500 },
    );
  }
}

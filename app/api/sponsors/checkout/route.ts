import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSiteUrlFromRequest } from "@config/index";
import { stripeRequest } from "@lib/stripe/api";
import {
  buildLineItemParams,
  buildCustomFieldParams,
  buildMetadataParams,
} from "@lib/stripe/checkout-helpers";
import { isValidPlace } from "@utils/route-validation";
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
  baseUrl: string
): Promise<StripeCheckoutSessionResponse> {
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

  // Statement descriptor suffix - what customer sees on bank statement after your business name
  // Rules: max 22 chars for full descriptor, suffix typically 10 chars
  // Allowed: alphanumeric, spaces, dashes. NOT allowed: . < > ' "
  // Using suffix (not full descriptor) for card payment compatibility
  params.append(
    "payment_intent_data[statement_descriptor_suffix]",
    "ESDEV-CAT"
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
    const error = await response.text();
    console.error("Stripe API error:", error);
    throw new Error(`Stripe API error: ${response.status}`);
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
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    // Validate duration
    if (!duration || !(duration in DURATION_DAYS)) {
      return NextResponse.json(
        {
          error: `Invalid duration. Must be one of: ${Object.keys(DURATION_DAYS).join(", ")}`,
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

    // Validate place (format + blocklist check for system paths)
    if (!isValidPlace(place)) {
      return NextResponse.json(
        { error: "Invalid place format" },
        { status: 400 }
      );
    }

    // Generate idempotency key from request params to prevent duplicate sessions
    // Purpose: Same user + same params = same Stripe session (prevents duplicate charges on retry)
    //
    // Primary: visitor_id from x-visitor-id header (set by proxy.ts middleware)
    // - proxy.ts ALWAYS sets this header for /api/sponsors/checkout requests
    // - Uses existing cookie OR generates new UUID, then forwards via header
    // - Header is used because cookie isn't available to route handler until next request
    //
    // Fallback: IP-based key (only if header somehow missing)
    // - Maintains idempotency for retries (same IP = same key)
    // - Small theoretical collision risk for users behind same NAT with identical params
    //   (same duration + geoScope + place + placeName) - astronomically unlikely
    // - UUID fallback was rejected: defeats idempotency entirely, causes duplicate charges
    const visitorId = request.headers.get("x-visitor-id");
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown-ip";

    // Log warning if fallback is used - this should never happen in production
    // If we see this in logs, investigate why proxy.ts isn't setting the header
    if (!visitorId) {
      console.warn(
        "[checkout] Missing x-visitor-id header - using IP fallback. " +
          `IP: ${clientIp}, place: ${place}. Investigate proxy.ts middleware.`
      );
    }

    const userKey = visitorId || `ip-${clientIp}`;
    const idempotencyKey = crypto
      .createHash("sha256")
      .update(`${userKey}-${duration}-${geoScope}-${place}-${placeName}`)
      .digest("hex")
      .slice(0, 32);

    // Get the actual request URL for redirects (important for preview deployments)
    const baseUrl = getSiteUrlFromRequest(request);

    const session = await createStripeCheckoutSession(
      duration,
      locale,
      place,
      placeName,
      geoScope,
      idempotencyKey,
      baseUrl
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

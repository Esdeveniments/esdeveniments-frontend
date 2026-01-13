import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import type {
  SponsorDuration,
  SponsorCheckoutRequest,
  StripeCheckoutSessionResponse,
} from "types/sponsor";

/**
 * Pricing configuration (in cents)
 */
const PRICING: Record<SponsorDuration, number> = {
  "3days": 500, // €5.00
  "7days": 1200, // €12.00
  "14days": 2000, // €20.00
  "30days": 3500, // €35.00
};

const DURATION_DAYS: Record<SponsorDuration, number> = {
  "3days": 3,
  "7days": 7,
  "14days": 14,
  "30days": 30,
};

/**
 * Product names by locale
 */
const PRODUCT_NAMES: Record<string, Record<SponsorDuration, string>> = {
  ca: {
    "3days": "Patrocini 3 dies",
    "7days": "Patrocini 7 dies",
    "14days": "Patrocini 14 dies",
    "30days": "Patrocini 30 dies",
  },
  es: {
    "3days": "Patrocinio 3 días",
    "7days": "Patrocinio 7 días",
    "14days": "Patrocinio 14 días",
    "30days": "Patrocinio 30 días",
  },
  en: {
    "3days": "Sponsorship 3 days",
    "7days": "Sponsorship 7 days",
    "14days": "Sponsorship 14 days",
    "30days": "Sponsorship 30 days",
  },
};

/**
 * Custom field labels by locale (max 3 fields in Stripe Checkout)
 * Place is pre-selected on our site, so we only need business name and target URL
 */
const CUSTOM_FIELD_LABELS: Record<
  string,
  { businessName: string; targetUrl: string }
> = {
  ca: {
    businessName: "Nom del negoci",
    targetUrl: "URL del teu web (opcional)",
  },
  es: {
    businessName: "Nombre del negocio",
    targetUrl: "URL de tu web (opcional)",
  },
  en: {
    businessName: "Business name",
    targetUrl: "Your website URL (optional)",
  },
};

/**
 * Create Stripe Checkout Session using REST API (no SDK needed)
 */
async function createStripeCheckoutSession(
  duration: SponsorDuration,
  locale: string,
  place: string,
  placeName: string,
  idempotencyKey: string
): Promise<StripeCheckoutSessionResponse> {
  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

  if (!STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://esdeveniments.cat";
  const productNames = PRODUCT_NAMES[locale] || PRODUCT_NAMES.ca;
  const labels = CUSTOM_FIELD_LABELS[locale] || CUSTOM_FIELD_LABELS.ca;

  // Build form-urlencoded body
  const params = new URLSearchParams();

  // Mode
  params.append("mode", "payment");

  // URLs - Stripe replaces {CHECKOUT_SESSION_ID} with actual session ID
  // Include place info so upload page knows where the ad will appear
  params.append(
    "success_url",
    `${baseUrl}/patrocina/upload?session_id={CHECKOUT_SESSION_ID}&place=${encodeURIComponent(
      place
    )}&placeName=${encodeURIComponent(placeName)}`
  );
  params.append("cancel_url", `${baseUrl}/patrocina?cancelled=true`);

  // Line item with dynamic pricing
  params.append("line_items[0][price_data][currency]", "eur");
  params.append(
    "line_items[0][price_data][unit_amount]",
    String(PRICING[duration])
  );
  params.append(
    "line_items[0][price_data][product_data][name]",
    productNames[duration]
  );
  params.append(
    "line_items[0][price_data][product_data][description]",
    `${DURATION_DAYS[duration]} dies de patrocini a Esdeveniments.cat`
  );
  params.append("line_items[0][quantity]", "1");

  // Custom fields to collect sponsor details (Stripe max: 3 fields)
  // Place is pre-selected on our site, so only 2 fields needed

  // Field 1: Business name (text) - required
  params.append("custom_fields[0][key]", "business_name");
  params.append("custom_fields[0][label][type]", "custom");
  params.append("custom_fields[0][label][custom]", labels.businessName);
  params.append("custom_fields[0][type]", "text");

  // Field 2: Target URL (text) - optional, where clicks should go
  params.append("custom_fields[1][key]", "target_url");
  params.append("custom_fields[1][label][type]", "custom");
  params.append("custom_fields[1][label][custom]", labels.targetUrl);
  params.append("custom_fields[1][type]", "text");
  params.append("custom_fields[1][optional]", "true");

  // Note: Image URL collected via email follow-up

  // Metadata for our reference (includes pre-selected place)
  // Set on both session AND payment_intent so it shows in Dashboard transaction view
  params.append("metadata[product]", "sponsor_banner");
  params.append("metadata[duration]", duration);
  params.append("metadata[duration_days]", String(DURATION_DAYS[duration]));
  params.append("metadata[place]", place);
  params.append("metadata[place_name]", placeName);

  // Copy metadata to payment_intent for Dashboard visibility
  params.append("payment_intent_data[metadata][product]", "sponsor_banner");
  params.append("payment_intent_data[metadata][duration]", duration);
  params.append(
    "payment_intent_data[metadata][duration_days]",
    String(DURATION_DAYS[duration])
  );
  params.append("payment_intent_data[metadata][place]", place);
  params.append("payment_intent_data[metadata][place_name]", placeName);

  // Locale for checkout page (Stripe doesn't support Catalan, use Spanish as fallback)
  const stripeLocale = locale === "ca" ? "es" : locale === "es" ? "es" : "en";
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
          "Stripe-Version": "2025-03-31.basil", // Pin API version - must match Stripe dashboard
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
    const { duration, locale = "ca", place, placeName } = body;

    // Validate duration
    if (!duration || !PRICING[duration]) {
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

    // Generate idempotency key from request params to prevent duplicate sessions
    const idempotencyKey = crypto
      .createHash("sha256")
      .update(`${duration}-${place}-${Date.now()}`)
      .digest("hex")
      .slice(0, 32);

    const session = await createStripeCheckoutSession(
      duration,
      locale,
      place,
      placeName,
      idempotencyKey
    );

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

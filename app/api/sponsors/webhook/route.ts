import { NextRequest, NextResponse } from "next/server";
import { captureException } from "@sentry/nextjs";
import {
  updatePaymentIntentMetadata,
  constructEvent,
  parseAndValidateEvent,
} from "@lib/stripe";
import { createSponsor, findSponsorBySessionId } from "@lib/db/sponsors";
import type {
  StripeWebhookEvent,
  StripeWebhookCheckoutSession,
  StripeWebhookPaymentIntent,
  GeoScope,
  SponsorStatus,
} from "types/sponsor";
import { VALID_GEO_SCOPES, DURATION_DAYS } from "types/sponsor";
import { MS_PER_DAY } from "@utils/constants";

/**
 * Stripe Webhook handler for sponsor payments.
 *
 * Listens for:
 * - checkout.session.completed: Confirm payment (only if payment_status === "paid")
 * - checkout.session.async_payment_succeeded: Delayed payment confirmation (bank transfers, SEPA)
 * - checkout.session.async_payment_failed: Handle failed async payments
 * - checkout.session.expired: Clean up abandoned sessions
 * - payment_intent.succeeded: Secondary confirmation (optional redundancy)
 *
 * Note: checkout.session.completed can fire with payment_status "unpaid" for async
 * payment methods. We guard against this to avoid premature sponsor activation.
 *
 * @see https://stripe.com/docs/webhooks
 * @see https://stripe.com/docs/webhooks/best-practices
 * @see https://stripe.com/docs/payments/checkout/fulfill-orders#delayed-notification
 */

/**
 * Route segment config for Lambda/Edge compatibility
 * - runtime: nodejs for crypto module compatibility
 * - maxDuration: 30s to allow time for Stripe API calls
 */
export const runtime = "nodejs";
export const maxDuration = 30;

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Fail-fast: Prevent accidental misconfiguration in production
// This check runs once at module load, crashing the app immediately on deploy
if (
  process.env.NODE_ENV === "production" &&
  process.env.STRIPE_WEBHOOK_SKIP_VERIFY === "true"
) {
  throw new Error(
    "FATAL: STRIPE_WEBHOOK_SKIP_VERIFY=true is forbidden in production",
  );
}

/**
 * Extract custom field value by key
 */
function getCustomFieldValue(
  session: StripeWebhookCheckoutSession,
  key: string,
): string | null {
  const field = session.custom_fields?.find((f) => f.key === key);
  if (!field) return null;

  return (
    field.text?.value ?? field.dropdown?.value ?? field.numeric?.value ?? null
  );
}

/**
 * Process completed checkout session
 *
 * Note: checkout.session.completed fires when checkout flow completes, but for async
 * payment methods (bank transfers, SEPA, etc.) payment_status may be "unpaid".
 * We only process when payment_status === "paid" to avoid premature business logic.
 *
 * @see https://stripe.com/docs/payments/checkout/fulfill-orders#delayed-notification
 */
async function handleCheckoutCompleted(
  session: StripeWebhookCheckoutSession,
): Promise<void> {
  // Only process sponsor_banner payments
  if (session.metadata?.product !== "sponsor_banner") {
    console.log("Skipping non-sponsor checkout:", session.id);
    return;
  }

  // Guard: Only process when payment is actually completed
  // For async payment methods, wait for checkout.session.async_payment_succeeded
  if (session.payment_status !== "paid") {
    console.log(
      `Checkout ${session.id} completed but payment_status is "${session.payment_status}" - awaiting payment confirmation`,
    );
    return;
  }

  // Extract custom fields (filled by customer during checkout)
  const businessName = getCustomFieldValue(session, "business_name");
  const targetUrl = getCustomFieldValue(session, "target_url");

  // Copy custom_fields to payment intent metadata so they appear in Dashboard
  if (session.payment_intent && (businessName || targetUrl)) {
    const metadataUpdate: Record<string, string> = {};
    if (businessName) metadataUpdate.business_name = businessName;
    if (targetUrl) metadataUpdate.target_url = targetUrl;
    // Also add customer email for easy reference
    if (session.customer_details?.email) {
      metadataUpdate.customer_email = session.customer_details.email;
    }

    const updated = await updatePaymentIntentMetadata(
      session.payment_intent,
      metadataUpdate,
    );
    console.log(
      `Payment intent ${session.payment_intent} metadata update:`,
      updated ? "success" : "failed",
    );
  }

  // Extract all relevant data for business logic
  const sponsorData = {
    sessionId: session.id,
    paymentIntentId: session.payment_intent,
    // From metadata (set during session creation)
    duration: session.metadata.duration,
    durationDays: session.metadata.duration_days,
    place: session.metadata.place,
    placeName: session.metadata.place_name,
    geoScope: session.metadata.geo_scope,
    // From custom_fields (filled by customer)
    businessName,
    targetUrl,
    // From image upload (added after checkout, may be null if not yet uploaded)
    imageUrl: session.metadata.sponsor_image_url || null,
    imagePublicId: session.metadata.sponsor_image_public_id || null,
    // Customer info
    customerEmail: session.customer_details?.email || null,
    customerName: session.customer_details?.name || null,
    // Payment info
    amountPaid: session.amount_total,
    currency: session.currency,
  };

  // Log sponsor data with PII redacted for privacy
  console.log("Sponsor checkout completed:", {
    sessionId: sponsorData.sessionId,
    paymentIntentId: sponsorData.paymentIntentId,
    duration: sponsorData.duration,
    durationDays: sponsorData.durationDays,
    place: sponsorData.place,
    placeName: sponsorData.placeName,
    geoScope: sponsorData.geoScope,
    businessName: sponsorData.businessName,
    targetUrl: sponsorData.targetUrl,
    imageUrl: sponsorData.imageUrl ? "[set]" : null,
    amountPaid: sponsorData.amountPaid,
    currency: sponsorData.currency,
    hasCustomerEmail: !!sponsorData.customerEmail,
    hasCustomerName: !!sponsorData.customerName,
  });

  // Idempotency: skip if already processed (Stripe may retry webhooks)
  const alreadyExists = await findSponsorBySessionId(session.id);
  if (alreadyExists) {
    console.log(`Sponsor already exists for session ${session.id} — skipping`);
    return;
  }

  // Calculate start/end dates from payment date
  const durationDays =
    Number(sponsorData.durationDays) ||
    DURATION_DAYS[sponsorData.duration as keyof typeof DURATION_DAYS] ||
    7;
  const now = new Date();
  const startDate = now.toISOString().slice(0, 10);
  const endDateObj = new Date(now.getTime() + (durationDays - 1) * MS_PER_DAY);
  const endDate = endDateObj.toISOString().slice(0, 10);

  // Determine status: if image already uploaded, activate immediately
  const hasImage = !!sponsorData.imageUrl;
  const status: SponsorStatus = hasImage ? "active" : "pending_image";

  // Validate geoScope from metadata
  const geoScope = VALID_GEO_SCOPES.includes(sponsorData.geoScope as GeoScope)
    ? (sponsorData.geoScope as GeoScope)
    : "town";

  // Validate place is present — without it the sponsor row is useless
  const places = sponsorData.place ? [sponsorData.place] : [];
  if (places.length === 0) {
    throw new Error(`Sponsor checkout missing place for session ${session.id}`);
  }

  // Save sponsor to Turso database
  const sponsorId = await createSponsor({
    businessName:
      sponsorData.businessName || sponsorData.placeName || "Sponsor",
    imageUrl: sponsorData.imageUrl,
    targetUrl: sponsorData.targetUrl,
    places,
    geoScope,
    startDate,
    endDate,
    status,
    stripeSessionId: sponsorData.sessionId,
    stripePaymentIntentId: sponsorData.paymentIntentId,
    customerEmail: sponsorData.customerEmail,
    amountPaid: sponsorData.amountPaid,
    currency: sponsorData.currency,
    duration: sponsorData.duration,
    durationDays,
  });

  // Treat DB write failure as a hard error so Stripe retries the webhook
  if (!sponsorId) {
    throw new Error(
      `Failed to save sponsor to database for session ${session.id} (DB unavailable)`,
    );
  }

  console.log(
    `Sponsor ${status === "active" ? "activated" : "created (pending image)"}:`,
    { sponsorId, sessionId: session.id, status, startDate, endDate },
  );
}

/**
 * Process successful payment intent (secondary confirmation)
 */
function handlePaymentIntentSucceeded(
  paymentIntent: StripeWebhookPaymentIntent,
): void {
  // Only log sponsor payments
  if (paymentIntent.metadata?.product !== "sponsor_banner") {
    return;
  }

  console.log("Payment intent succeeded:", {
    id: paymentIntent.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    metadata: paymentIntent.metadata,
  });

  // This is a secondary confirmation - main logic is in checkout.session.completed
  // Useful for reconciliation or if you need payment_intent-level tracking
}

/**
 * Unified event handler - single source of truth for all webhook event processing
 */
async function handleEvent(event: StripeWebhookEvent): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(
        event.data.object as StripeWebhookCheckoutSession,
      );
      break;

    case "checkout.session.async_payment_succeeded":
      // Async payment completed (bank transfers, SEPA, etc.)
      // Process same as completed - the payment_status will now be "paid"
      await handleCheckoutCompleted(
        event.data.object as StripeWebhookCheckoutSession,
      );
      break;

    case "checkout.session.async_payment_failed":
      console.log("Async payment failed for checkout:", event.data.object.id);
      // Optionally notify admin or clean up pending sponsor data
      break;

    case "checkout.session.expired":
      console.log("Checkout session expired:", event.data.object.id);
      // Optionally clean up any pending data
      break;

    case "payment_intent.succeeded":
      handlePaymentIntentSucceeded(
        event.data.object as StripeWebhookPaymentIntent,
      );
      break;

    default:
      console.log("Unhandled event type:", event.type);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const payload = await request.text();
    const signature = request.headers.get("stripe-signature");

    // Local dev bypass: requires EXPLICIT opt-in via STRIPE_WEBHOOK_SKIP_VERIFY=true
    // This prevents accidental bypass in misconfigured deployments
    // For local dev with signature verification, use Stripe CLI:
    //   stripe listen --forward-to localhost:3000/api/sponsors/webhook
    const allowUnsafeBypass =
      process.env.NODE_ENV === "development" &&
      process.env.STRIPE_WEBHOOK_SKIP_VERIFY === "true" &&
      !WEBHOOK_SECRET;

    if (allowUnsafeBypass) {
      console.warn(
        "⚠️ WEBHOOK SIGNATURE BYPASS: Processing unverified webhook (STRIPE_WEBHOOK_SKIP_VERIFY=true)",
      );
      try {
        const event = parseAndValidateEvent(payload);
        await handleEvent(event);
        return NextResponse.json({ received: true });
      } catch (parseError) {
        console.error("Failed to parse/validate webhook payload:", parseError);
        return NextResponse.json(
          { error: "Invalid webhook payload" },
          { status: 400 },
        );
      }
    }

    if (!WEBHOOK_SECRET) {
      console.error("STRIPE_WEBHOOK_SECRET is not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 },
      );
    }

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 },
      );
    }

    // Verify signature and validate payload with Zod schema
    let event: StripeWebhookEvent;
    try {
      event = constructEvent(payload, signature, WEBHOOK_SECRET);
    } catch (error) {
      console.error(
        "Webhook verification/validation failed:",
        error instanceof Error ? error.message : error,
      );
      return NextResponse.json(
        { error: "Invalid signature or payload" },
        { status: 400 },
      );
    }

    await handleEvent(event);

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    const isParsingError = error instanceof SyntaxError;

    // Enhanced logging for debugging while preventing sensitive data exposure
    console.error(
      `Webhook error (${isParsingError ? "fatal" : "potentially transient"}):`,
      {
        message: error instanceof Error ? error.message : "Unknown error",
        type: error instanceof Error ? error.name : typeof error,
        // Only log stack in development for debugging
        ...(process.env.NODE_ENV === "development" && {
          stack: error instanceof Error ? error.stack : undefined,
        }),
      },
    );

    // Capture error in Sentry for monitoring/alerting
    captureException(error, {
      tags: { webhook: "stripe", handler: "sponsor" },
    });

    // If it's a JSON parsing error, the payload is invalid. Acknowledge and stop retries.
    if (isParsingError) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 },
      );
    }

    // For other errors (e.g., network failures in updatePaymentIntentMetadata),
    // returning 500 signals Stripe to retry, which is safer for transient issues.
    return NextResponse.json(
      { error: "Webhook handler failed. Please retry." },
      { status: 500 },
    );
  }
}

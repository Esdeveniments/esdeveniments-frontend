import { NextRequest, NextResponse } from "next/server";
import { captureException } from "@sentry/nextjs";
import {
  updatePaymentIntentMetadata,
  verifyStripeSignature,
} from "@lib/stripe";
import type {
  StripeWebhookEvent,
  StripeWebhookCheckoutSession,
  StripeWebhookPaymentIntent,
} from "types/sponsor";

/**
 * Stripe Webhook handler for sponsor payments.
 *
 * Listens for:
 * - checkout.session.completed: Confirm payment, extract custom_fields, copy to payment intent
 * - checkout.session.expired: Clean up abandoned sessions
 * - payment_intent.succeeded: Secondary confirmation (optional redundancy)
 *
 * @see https://stripe.com/docs/webhooks
 * @see https://stripe.com/docs/webhooks/best-practices
 */

/**
 * Route segment config for Lambda/Edge compatibility
 * - runtime: nodejs for crypto module compatibility
 * - maxDuration: 30s to allow time for Stripe API calls
 */
export const runtime = "nodejs";
export const maxDuration = 30;

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Extract custom field value by key
 */
function getCustomFieldValue(
  session: StripeWebhookCheckoutSession,
  key: string
): string | null {
  const field = session.custom_fields?.find((f) => f.key === key);
  if (!field) return null;

  return field.text?.value ?? field.dropdown?.value ?? field.numeric?.value ?? null;
}

/**
 * Process completed checkout session
 */
async function handleCheckoutCompleted(
  session: StripeWebhookCheckoutSession
): Promise<void> {
  // Only process sponsor_banner payments
  if (session.metadata?.product !== "sponsor_banner") {
    console.log("Skipping non-sponsor checkout:", session.id);
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
      metadataUpdate
    );
    console.log(
      `Payment intent ${session.payment_intent} metadata update:`,
      updated ? "success" : "failed"
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
    // PII redacted - do not log customer email/name
    hasCustomerEmail: !!sponsorData.customerEmail,
    hasCustomerName: !!sponsorData.customerName,
  });

  // TODO: Add your business logic here:
  // - Save to database
  // - Send confirmation email
  // - Notify admin (e.g., Slack, email)
  // - Activate sponsor if image already uploaded
}

/**
 * Process successful payment intent (secondary confirmation)
 */
function handlePaymentIntentSucceeded(
  paymentIntent: StripeWebhookPaymentIntent
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
        event.data.object as StripeWebhookCheckoutSession
      );
      break;

    case "checkout.session.expired":
      console.log("Checkout session expired:", event.data.object.id);
      // Optionally clean up any pending data
      break;

    case "payment_intent.succeeded":
      handlePaymentIntentSucceeded(
        event.data.object as StripeWebhookPaymentIntent
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

    // Local dev bypass: allow unverified webhooks when no secret configured
    // For production, always use Stripe CLI: stripe listen --forward-to localhost:3000/api/sponsors/webhook
    const isLocalDev =
      process.env.NODE_ENV === "development" && !WEBHOOK_SECRET;

    if (isLocalDev) {
      console.warn(
        "⚠️ WEBHOOK SIGNATURE BYPASS: Processing unverified webhook in local dev mode"
      );
      try {
        const event = JSON.parse(payload) as StripeWebhookEvent;
        await handleEvent(event);
        return NextResponse.json({ received: true });
      } catch (parseError) {
        console.error("Failed to parse webhook payload:", parseError);
        return NextResponse.json(
          { error: "Invalid JSON payload" },
          { status: 400 }
        );
      }
    }

    if (!WEBHOOK_SECRET) {
      console.error("STRIPE_WEBHOOK_SECRET is not configured");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    // Verify signature
    const verificationResult = verifyStripeSignature(
      payload,
      signature,
      WEBHOOK_SECRET
    );
    if (!verificationResult.valid) {
      console.error("Invalid webhook signature:", verificationResult.error);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(payload) as StripeWebhookEvent;
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
      }
    );

    // Capture error in Sentry for monitoring/alerting
    captureException(error, {
      tags: { webhook: "stripe", handler: "sponsor" },
    });

    // If it's a JSON parsing error, the payload is invalid. Acknowledge and stop retries.
    if (isParsingError) {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    // For other errors (e.g., network failures in updatePaymentIntentMetadata),
    // returning 500 signals Stripe to retry, which is safer for transient issues.
    return NextResponse.json(
      { error: "Webhook handler failed. Please retry." },
      { status: 500 }
    );
  }
}

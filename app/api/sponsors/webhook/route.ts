import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
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
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_API_VERSION = "2025-03-31.basil";

/**
 * Verify Stripe webhook signature
 */
function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const elements = signature.split(",");
  const signatureMap: Record<string, string> = {};

  for (const element of elements) {
    const [key, value] = element.split("=");
    if (key && value) {
      signatureMap[key] = value;
    }
  }

  const timestamp = signatureMap["t"];
  const v1Signature = signatureMap["v1"];

  if (!timestamp || !v1Signature) {
    return false;
  }

  // Check timestamp to prevent replay attacks (5 min tolerance)
  const timestampNum = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestampNum) > 300) {
    console.error("Webhook timestamp too old:", { timestamp, now });
    return false;
  }

  // Compute expected signature
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  // Constant-time comparison (check lengths first to avoid RangeError)
  const sigBuffer = Buffer.from(v1Signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
}

/**
 * Extract custom field value by key
 */
function getCustomFieldValue(
  session: StripeWebhookCheckoutSession,
  key: string
): string | null {
  const field = session.custom_fields?.find((f) => f.key === key);
  if (!field) return null;

  // Handle different field types
  if (field.text?.value) return field.text.value;
  if (field.dropdown?.value) return field.dropdown.value;
  if (field.numeric?.value) return field.numeric.value;

  return null;
}

/**
 * Update Payment Intent metadata via Stripe API
 * This copies custom_fields to the payment intent so they show in Dashboard
 */
async function updatePaymentIntentMetadata(
  paymentIntentId: string,
  metadata: Record<string, string>
): Promise<boolean> {
  if (!STRIPE_SECRET_KEY) {
    console.error("STRIPE_SECRET_KEY not configured for metadata update");
    return false;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(metadata)) {
    if (value) {
      params.append(`metadata[${key}]`, value);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      `https://api.stripe.com/v1/payment_intents/${encodeURIComponent(
        paymentIntentId
      )}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Stripe-Version": STRIPE_API_VERSION,
        },
        body: params.toString(),
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Failed to update payment intent metadata:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating payment intent metadata:", error);
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
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

  console.log(
    "Sponsor checkout completed:",
    JSON.stringify(sponsorData, null, 2)
  );

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

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const payload = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!WEBHOOK_SECRET) {
      console.error("STRIPE_WEBHOOK_SECRET is not configured");
      // In development, process without verification
      if (process.env.NODE_ENV === "development") {
        try {
          const event = JSON.parse(payload) as StripeWebhookEvent;
          if (event.type === "checkout.session.completed") {
            await handleCheckoutCompleted(
              event.data.object as StripeWebhookCheckoutSession
            );
          } else if (event.type === "payment_intent.succeeded") {
            handlePaymentIntentSucceeded(
              event.data.object as StripeWebhookPaymentIntent
            );
          }
          return NextResponse.json({ received: true });
        } catch (parseError) {
          console.error("Failed to parse webhook payload in dev mode:", parseError);
          return NextResponse.json(
            { error: "Invalid JSON payload" },
            { status: 400 }
          );
        }
      }
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
    if (!verifyStripeSignature(payload, signature, WEBHOOK_SECRET)) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(payload) as StripeWebhookEvent;

    // Handle specific event types
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

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    // Return 200 anyway to prevent Stripe retries for parsing errors
    return NextResponse.json({ received: true, error: "Processing error" });
  }
}

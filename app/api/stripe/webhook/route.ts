import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import Stripe from "stripe";
import { headers } from "next/headers";

// Lazy initialize Stripe to avoid build errors when API key is missing
function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }
  return new Stripe(secretKey, {
    apiVersion: "2025-08-27.basil",
  });
}

function getWebhookSecret(): string {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is not set");
  }
  return webhookSecret;
}

/**
 * Stripe webhook handler for restaurant promotion payments
 * Verifies signature and activates promotions on successful payment
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json(
        {
          error:
            "Stripe is not configured. Please set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET environment variables.",
        },
        { status: 503 }
      );
    }

    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      console.error("Missing Stripe signature");
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      const stripe = getStripe();
      const webhookSecret = getWebhookSecret();
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const { leadId, eventId, durationDays, geoScopeType, geoScopeId } =
        session.metadata || {};

      if (
        !leadId ||
        !eventId ||
        !durationDays ||
        !geoScopeType ||
        !geoScopeId
      ) {
        console.error(
          "Missing required metadata in Stripe session:",
          session.metadata
        );
        return NextResponse.json(
          { error: "Missing metadata" },
          { status: 400 }
        );
      }

      // Calculate expiration date
      const durationDaysNum = parseInt(durationDays);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDaysNum);

      // TODO: Update lead in database
      const updatedLead = {
        id: leadId,
        status: "active" as const,
        expiresAt: expiresAt.toISOString(),
        stripeSessionId: session.id,
        stripePaymentIntentId: session.payment_intent as string,
        geoScopeType,
        geoScopeId,
        durationDays: durationDaysNum,
      };

      console.log("Activated restaurant promotion:", updatedLead);

      // TODO: Implement geo scope resolution
      // This should resolve the geo scope to specific event IDs or boundaries
      // For now, we'll log the scope information
      console.log(
        `Promotion scope: ${geoScopeType} (${geoScopeId}) for ${durationDays} days`
      );

      // TODO: Update event visibility or add promotion to event display
      // This depends on how promotions are displayed on the event page
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

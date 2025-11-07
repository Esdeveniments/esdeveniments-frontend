import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import { headers } from "next/headers";

/**
 * Dynamically create a Stripe client only if the secret key is present and the dependency exists.
 * While Stripe is removed from package.json this will always hit the catch block and we return null.
 * Re‑enable by installing the dependency: `yarn add stripe` and (optionally) replacing this with a static import.
 */
async function createStripeClient(): Promise<unknown | null> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  try {
    const mod = await import("stripe");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Ctor = (mod as { default: any }).default;
    return new Ctor(secretKey, { apiVersion: "2025-08-27.basil" });
  } catch {
    // Dependency missing — keep silent (expected while package removed)
    return null;
  }
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let event: any;

    try {
      // Verify webhook signature
      const stripe = await createStripeClient();
      if (!stripe) {
        return NextResponse.json(
          {
            error:
              "Stripe payments are not available (dependency not installed).",
          },
          { status: 503 }
        );
      }

      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        throw new Error(
          "STRIPE_WEBHOOK_SECRET environment variable is not set"
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      event = (stripe as any).webhooks.constructEvent(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

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

      // TODO: When database writes are implemented, use revalidateTag() for cache invalidation
      // Example: import { revalidateTag } from "next/cache"; import { eventTag, promotionsTag } from "lib/cache/tags";
      // revalidateTag(eventTag(eventId), "default"); // SWR behavior for background revalidation
      // revalidateTag(promotionsTag, "default"); // Invalidate promotions cache
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

import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import {
  StripeCheckoutRequest,
  StripeCheckoutResponse,
} from "types/api/restaurant";
import { getPricingConfig } from "config/pricing";
import { CheckoutSessionCreateParamsLocal } from "types/stripe-local";

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
 * Create Stripe Checkout Session for restaurant promotion
 * Uses dynamic pricing from configuration
 */
export async function POST(request: NextRequest) {
  try {
    // If secret key absent we short‑circuit (feature disabled while dependency removed)
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Stripe payments are temporarily disabled." },
        { status: 503 }
      );
    }

    const body: StripeCheckoutRequest = await request.json();
    const { leadId, eventId } = body;

    if (!leadId || !eventId) {
      return NextResponse.json(
        { error: "Missing required fields: leadId, eventId" },
        { status: 400 }
      );
    }

    // TODO: Load lead from database
    // For now, we'll simulate loading the lead
    const lead = {
      id: leadId,
      displayDurationDays: 3, // This should come from the database
      geoScopeType: "town" as const, // This should come from the database
      geoScopeId: "barcelona", // This should come from the database
      restaurantName: "Sample Restaurant", // This should come from the database
    };

    // Get pricing configuration
    const pricing = getPricingConfig(
      lead.displayDurationDays,
      lead.geoScopeType
    );
    if (!pricing) {
      return NextResponse.json(
        { error: "Pricing not available for this combination" },
        { status: 400 }
      );
    }

    // Build success and cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const successUrl = `${baseUrl}/e/${eventId}?promotion=success`;
    const cancelUrl = `${baseUrl}/e/${eventId}?promotion=cancelled`;

    // Create Stripe Checkout Session
    const sessionParams: CheckoutSessionCreateParamsLocal = {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: pricing.currency,
            unit_amount: pricing.unitAmount,
            product_data: {
              name: `Restaurant Promotion - ${lead.restaurantName}`,
              description: `Promote your restaurant for ${lead.displayDurationDays} day(s) in ${lead.geoScopeType}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        leadId,
        eventId,
        durationDays: lead.displayDurationDays.toString(),
        geoScopeType: lead.geoScopeType,
        geoScopeId: lead.geoScopeId,
      },
    };

    // Adjust tax config only if we eventually talk to Stripe
    if (pricing.taxMode === "automatic") {
      sessionParams.automatic_tax = { enabled: true };
    } else if (
      pricing.taxMode === "manual" &&
      pricing.manualTaxRateIds?.length
    ) {
      sessionParams.line_items = sessionParams.line_items.map((li) => ({
        ...li,
        tax_rates: pricing.manualTaxRateIds,
      }));
    }

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = await (stripe as any).checkout.sessions.create(
      sessionParams
    );

    const response: StripeCheckoutResponse = {
      sessionUrl: session.url || "",
      sessionId: session.id,
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error creating Stripe checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

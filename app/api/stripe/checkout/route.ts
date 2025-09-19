import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
import Stripe from "stripe";
import {
  StripeCheckoutRequest,
  StripeCheckoutResponse,
} from "types/api/restaurant";
import { getPricingConfig } from "config/pricing";

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

/**
 * Create Stripe Checkout Session for restaurant promotion
 * Uses dynamic pricing from configuration
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        {
          error:
            "Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.",
        },
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
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
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

    // Configure tax settings based on pricing configuration
    if (pricing.taxMode === "automatic") {
      sessionParams.automatic_tax = { enabled: true };
    } else if (
      pricing.taxMode === "manual" &&
      pricing.manualTaxRateIds?.length
    ) {
      sessionParams.line_items = sessionParams.line_items?.map((item) => ({
        ...item,
        tax_rates: pricing.manualTaxRateIds,
      }));
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create(sessionParams);

    const response: StripeCheckoutResponse = {
      sessionUrl: session.url!,
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

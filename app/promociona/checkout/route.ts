import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  PROMOTE_PRICING,
  PROMOTE_PLACEMENT_MULTIPLIER,
} from "@utils/constants";

function getOrigin(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const kind = params.get("kind") || "business";
  const scope = params.get("scope") || "ciutat"; // zona|ciutat|pais
  const days = Number(params.get("days") || 7);
  const placement = params.get("placement") || "global";
  const place = params.get("place") || "catalunya";
  const eventId = params.get("eventId") || undefined;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    // Safe fallback: go back to the page with an error flag
    const back = `${getOrigin(request)}/promociona?${params.toString()}&stripe=missing`;
    return NextResponse.redirect(back, { status: 302 });
  }

  // Compute amount (EUR cents) based on constants
  const base = PROMOTE_PRICING[scope as keyof typeof PROMOTE_PRICING]?.[days as keyof (typeof PROMOTE_PRICING)["zona"]] || 0;
  const multiplier = PROMOTE_PLACEMENT_MULTIPLIER[placement] ?? 1;
  const amount = Math.max(1, Math.round(base * multiplier * 100));

  const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" } as Stripe.StripeConfig);

  const successUrl = `${getOrigin(request)}/promociona/success?session_id={CHECKOUT_SESSION_ID}&${params.toString()}`;
  const cancelUrl = `${getOrigin(request)}/promociona?${params.toString()}&canceled=1`;

  const productName = kind === "business" ? "Promoció negoci" : "Promoció esdeveniment";
  const description = `${productName} · ${scope} · ${days} dies · ${placement} · ${place}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    currency: "eur",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: amount,
          product_data: {
            name: productName,
            description,
          },
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      kind,
      scope,
      days: String(days),
      placement,
      place,
      eventId: eventId || "",
    },
  });

  if (!session.url) {
    return NextResponse.redirect(cancelUrl, { status: 302 });
  }

  return NextResponse.redirect(session.url, { status: 303 });
}
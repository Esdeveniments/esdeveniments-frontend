import { NextRequest, NextResponse } from "next/server";
import { getPricingConfig } from "@config/pricing";
import {
  PricePreviewRequest,
  PricePreviewResponse,
} from "types/api/restaurant";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body: PricePreviewRequest = await req.json();
    const { durationDays, geoScopeType } = body;

    if (!durationDays || !geoScopeType) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const pricing = getPricingConfig(durationDays, geoScopeType);
    if (!pricing) {
      return NextResponse.json(
        { error: "Invalid combination" },
        { status: 400 }
      );
    }

    const resp: PricePreviewResponse = {
      currency: pricing.currency,
      unitAmount: pricing.unitAmount,
    };
    return NextResponse.json(resp, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

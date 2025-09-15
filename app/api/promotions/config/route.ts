import { NextRequest, NextResponse } from "next/server";
import {
  getAvailableDurations,
  getAvailableGeoScopes,
  getPricingConfig,
} from "@config/pricing";
import { PromotionsConfigResponse } from "types/api/restaurant";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const durations = getAvailableDurations();
  const geoScopes = getAvailableGeoScopes();
  // Infer currency/taxMode from one valid combination if available
  const sample = getPricingConfig(durations[0], geoScopes[0]);

  const body: PromotionsConfigResponse = {
    durations,
    geoScopes,
    currency: sample?.currency || process.env.STRIPE_CURRENCY || "eur",
    taxMode:
      (sample?.taxMode as any) ||
      (process.env.STRIPE_TAX_MODE as any) ||
      "automatic",
  };
  return NextResponse.json(body, { status: 200 });
}

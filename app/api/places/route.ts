import { NextResponse } from "next/server";
import { fetchPlacesAggregatedExternal } from "@lib/api/places-external";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await fetchPlacesAggregatedExternal();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    console.error("/api/places error", e);
    return NextResponse.json([], { status: 500 });
  }
}


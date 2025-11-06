import { NextResponse } from "next/server";
import { fetchRegionsWithCities } from "@lib/api/regions";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await fetchRegionsWithCities();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    console.error("/api/regions/options error", e);
    return NextResponse.json(
      { error: "Failed to load regions" },
      { status: 500 }
    );
  }
}

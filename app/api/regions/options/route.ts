import { NextResponse } from "next/server";
import { fetchRegionsOptionsExternal } from "@lib/api/regions-external";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await fetchRegionsOptionsExternal();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
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


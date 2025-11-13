import { NextResponse } from "next/server";
import { fetchCitiesExternal } from "@lib/api/cities-external";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await fetchCitiesExternal();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    console.error("/api/cities error", e);
    return NextResponse.json([], { status: 500 });
  }
}


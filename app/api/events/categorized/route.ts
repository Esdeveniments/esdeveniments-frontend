import { NextResponse } from "next/server";
import { fetchCategorizedEventsExternal } from "@lib/api/events-external";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const raw = url.searchParams.get("maxEventsPerCategory");
    const parsed = raw ? parseInt(raw, 10) : NaN;
    const maxEventsPerCategory =
      Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 100) : undefined;
    const data = await fetchCategorizedEventsExternal(maxEventsPerCategory);
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
      },
    });
  } catch (e) {
    console.error("/api/events/categorized error:", e);
    return NextResponse.json({}, { status: 500 });
  }
}


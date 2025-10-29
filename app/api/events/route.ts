import { NextRequest, NextResponse } from "next/server";
import { fetchEvents } from "@lib/api/events";
import { FetchEventsParams } from "types/event";

export const runtime = "nodejs";

// GET /api/events - proxy to external API with server-side HMAC signing
export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams;

    // Parse and clamp params from query
    const rawPage = search.get("page");
    const rawSize = search.get("size");
    const page = rawPage !== null ? Math.max(0, parseInt(rawPage, 10)) : undefined;
    const size = rawSize !== null ? Math.min(50, Math.max(1, parseInt(rawSize, 10))) : undefined;
    const lat = search.get("lat");
    const lon = search.get("lon");
    const radius = search.get("radius");

    const params: FetchEventsParams = {
      page,
      size,
      place: search.get("place") || undefined,
      category: search.get("category") || undefined,
      term: search.get("term") || undefined,
      byDate: search.get("byDate") || undefined,
      from: search.get("from") || undefined,
      to: search.get("to") || undefined,
      lat: lat !== null && !isNaN(parseFloat(lat)) ? parseFloat(lat) : undefined,
      lon: lon !== null && !isNaN(parseFloat(lon)) ? parseFloat(lon) : undefined,
      radius:
        radius !== null && !isNaN(parseFloat(radius))
          ? parseFloat(radius)
          : undefined,
    };

    const data = await fetchEvents(params);
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    console.error("/api/events proxy error:", e);
    return NextResponse.json(
      {
        content: [],
        currentPage: 0,
        pageSize: 10,
        totalElements: 0,
        totalPages: 0,
        last: true,
      },
      { status: 200 }
    );
  }
}

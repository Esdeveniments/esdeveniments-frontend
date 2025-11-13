import { NextResponse } from "next/server";
import { fetchEventsExternal } from "@lib/api/events-external";
import { FetchEventsParams } from "types/event";

export const runtime = "nodejs";

// GET /api/events - proxy to external API with server-side HMAC signing
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams;

    // Parse and clamp params from query (treat invalid as undefined)
    const rawPage = search.get("page");
    const rawSize = search.get("size");
    let page: number | undefined = undefined;
    let size: number | undefined = undefined;
    if (rawPage !== null) {
      const n = parseInt(rawPage, 10);
      if (Number.isFinite(n)) page = Math.max(0, n);
    }
    if (rawSize !== null) {
      const n = parseInt(rawSize, 10);
      if (Number.isFinite(n)) size = Math.min(50, Math.max(1, n));
    }
    const latRaw = search.get("lat");
    const lonRaw = search.get("lon");
    const radiusRaw = search.get("radius");

    const params: FetchEventsParams = {
      page,
      size,
      place: search.get("place") || undefined,
      category: search.get("category") || undefined,
      term: search.get("term") || undefined,
      byDate: search.get("byDate") || undefined,
      from: search.get("from") || undefined,
      to: search.get("to") || undefined,
      lat:
        latRaw !== null && Number.isFinite(parseFloat(latRaw))
          ? parseFloat(latRaw)
          : undefined,
      lon:
        lonRaw !== null && Number.isFinite(parseFloat(lonRaw))
          ? parseFloat(lonRaw)
          : undefined,
      radius:
        radiusRaw !== null && Number.isFinite(parseFloat(radiusRaw))
          ? parseFloat(radiusRaw)
          : undefined,
    };

    const data = await fetchEventsExternal(params);
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
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
      { status: 500 }
    );
  }
}

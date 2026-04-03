import { NextResponse } from "next/server";
import { fetchCategorizedEventsExternal } from "@lib/api/events-external";
import { handleApiError } from "@utils/api-error-handler";

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
        // s-maxage=1800: categorized events change infrequently.
        // swr=3600: serve stale instantly while revalidating in background.
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (e) {
    return handleApiError(e, "/api/events/categorized", {
      fallbackData: {},
    });
  }
}

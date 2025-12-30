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
        // Increased from 300s to reduce Lambda invocations
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=600",
      },
    });
  } catch (e) {
    return handleApiError(e, "/api/events/categorized", {
      fallbackData: {},
    });
  }
}

import { NextResponse } from "next/server";
import { fetchCitiesExternal } from "@lib/api/cities-external";
import { handleApiError } from "@utils/api-error-handler";

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
    return handleApiError(e, "/api/cities", {
      fallbackData: [],
    });
  }
}

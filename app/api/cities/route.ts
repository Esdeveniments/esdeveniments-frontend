import { NextResponse } from "next/server";
import { fetchCitiesExternal } from "@lib/api/cities-external";
import { handleApiError } from "@utils/api-error-handler";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await fetchCitiesExternal();
    const sampleCity = data?.[0];
    console.info("[cities] payload check", {
      count: data?.length ?? 0,
      sample: sampleCity
        ? {
            label: sampleCity.name,
            latitude: sampleCity.latitude,
            longitude: sampleCity.longitude,
          }
        : null,
    });
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

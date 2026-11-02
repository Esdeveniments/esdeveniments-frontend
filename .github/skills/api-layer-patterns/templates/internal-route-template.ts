/**
 * Internal route template: app/api/RESOURCE/route.ts
 *
 * Replace RESOURCE / Resource with your names. Mirrors app/api/categories/route.ts.
 * Not type-checked by the project (.github is outside tsc).
 *
 * Pick Cache-Control values by reading neighbouring app/api route.ts files.
 * If browsers call this route, add it to the lists in utils/api-gate.ts.
 */
import { NextResponse } from "next/server";
import { fetchResourcesExternal } from "@lib/api/RESOURCE-external";
import { handleApiError } from "@utils/api-error-handler";

export async function GET(request: Request) {
  try {
    const search = new URL(request.url).searchParams;

    // Parse and clamp params; treat invalid values as undefined.
    const rawPage = search.get("page");
    const page =
      rawPage !== null && Number.isFinite(parseInt(rawPage, 10))
        ? Math.max(0, parseInt(rawPage, 10))
        : undefined;

    const data = await fetchResourcesExternal({
      page,
      place: search.get("place") || undefined,
    });

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (e) {
    const response = handleApiError(e, "/api/RESOURCE", {
      errorMessage: "Failed to load RESOURCE",
    });
    // Never let the CDN cache an error.
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}

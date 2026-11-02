/**
 * Internal route template: app/api/RESOURCE/route.ts
 *
 * Replace RESOURCE / Resource with your names. Mirrors app/api/events/route.ts.
 * Not type-checked by the project (.github is outside tsc).
 *
 * Pick Cache-Control values by reading neighbouring app/api route.ts files.
 * If browsers call this route, add it to the lists in utils/api-gate.ts.
 */
import { NextResponse } from "next/server";
import { fetchResourcesExternalResult } from "@lib/api/RESOURCE-external";
import { handleApiError } from "@utils/api-error-handler";

export async function GET(request: Request) {
  try {
    const search = new URL(request.url).searchParams;

    // Parse and clamp params; treat invalid values as undefined.
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

    const result = await fetchResourcesExternalResult({
      page,
      size,
      place: search.get("place") || undefined,
    });

    // The wrapper already logged the failure; don't cache it on the CDN.
    if (!result.data) {
      return NextResponse.json(
        { error: "RESOURCE service unavailable" },
        {
          status: result.status ?? 502,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    return NextResponse.json(result.data, {
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

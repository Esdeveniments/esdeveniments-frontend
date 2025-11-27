import { NextResponse } from "next/server";
import { fetchEventBySlug as fetchExternalEvent } from "@lib/api/events-external";
import { revalidateTag } from "next/cache";
import { eventsTag, eventsCategorizedTag } from "@lib/cache/tags";
import { handleApiError } from "@utils/api-error-handler";

export const runtime = "nodejs";

// GET /api/events/[slug] - server-only proxy with server-side HMAC and stable caching
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const data = await fetchExternalEvent(slug);
    // If event is past, mark cache tags as stale for background revalidation
    // revalidateTag with "max" is idempotent, so multiple calls are safe
    if (data?.endDate && new Date(data.endDate).getTime() < Date.now()) {
      revalidateTag(eventsTag, "max");
      revalidateTag(eventsCategorizedTag, "max");
    }
    return NextResponse.json(data ?? null, {
      status: data ? 200 : 404,
      headers: {
        // Shared cache at the edge; app fetch can also set revalidate tags
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=1800",
      },
    });
  } catch (e) {
    return handleApiError(e, "/api/events/[slug]", {
      fallbackData: null,
    });
  }
}

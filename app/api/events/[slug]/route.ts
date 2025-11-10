import { NextResponse } from "next/server";
import { fetchEventBySlug as fetchExternalEvent } from "@lib/api/events-external";
import { revalidateTag } from "next/cache";
import { eventsTag, eventsCategorizedTag } from "@lib/cache/tags";

const revalidatedPastEvents = new Set<string>();

export const runtime = "nodejs";

// GET /api/events/[slug] - server-only proxy with server-side HMAC and stable caching
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const data = await fetchExternalEvent(slug);
    if (data?.endDate && data.id) {
      const key = String(data.id);
      if (!revalidatedPastEvents.has(key)) {
        const now = Date.now();
        if (new Date(data.endDate).getTime() < now) {
          revalidatedPastEvents.add(key);
          revalidateTag(eventsTag, "max");
          revalidateTag(eventsCategorizedTag, "max");
        }
      }
    }
    return NextResponse.json(data ?? null, {
      status: data ? 200 : 404,
      headers: {
        // Shared cache at the edge; app fetch can also set revalidate tags
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=1800",
      },
    });
  } catch (e) {
    console.error("/api/events/[slug] proxy error:", e);
    return NextResponse.json(null, { status: 500 });
  }
}

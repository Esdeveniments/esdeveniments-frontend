import { NextResponse } from "next/server";
import { fetchNewsBySlugExternal } from "@lib/api/news-external";
import { newsDetailCache } from "@lib/api/news";
import { handleApiError } from "@utils/api-error-handler";
import { getErrorStatus } from "@utils/error-status";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/news/[slug]">,
) {
  try {
    const { slug } = await ctx.params;
    // Share the bounded 24h detail cache with Server Components so refreshes
    // do not increment backend article visits.
    const data = await newsDetailCache(slug, async (key) => {
      return await fetchNewsBySlugExternal(key as string);
    });
    if (!data) {
      return NextResponse.json(null, {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      });
    }
    return NextResponse.json(data, {
      status: 200,
      headers: {
        // Published articles are stable; 30 min cache with 1h stale window.
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (e) {
    // fetchNewsBySlugExternal already logged the upstream failure and attached
    // its status. Return it with no-store (never 404, never cached) and skip
    // handleApiError so an upstream outage doesn't flood Sentry per request.
    const status = getErrorStatus(e);
    if (status !== undefined) {
      return NextResponse.json(
        { error: "News service unavailable" },
        { status, headers: { "Cache-Control": "no-store" } },
      );
    }
    const response = handleApiError(e, "/api/news/[slug]", {
      errorMessage: "News service unavailable",
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}

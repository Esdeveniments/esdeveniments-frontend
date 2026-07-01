import { NextResponse } from "next/server";
import { fetchUserEventsExternal } from "@lib/api/events-external";
import { handleApiError } from "@utils/api-error-handler";

// GET /api/users/[username]/events - proxy to the public per-user events
// listing with server-side HMAC signing. Only page & size are supported.
export async function GET(
  request: Request,
  context: { params: Promise<{ username: string }> },
) {
  try {
    const { username } = await context.params;
    const search = new URL(request.url).searchParams;

    let page = 0;
    let size = 12;
    const rawPage = search.get("page");
    const rawSize = search.get("size");
    if (rawPage !== null) {
      const n = parseInt(rawPage, 10);
      if (Number.isFinite(n)) page = Math.max(0, n);
    }
    if (rawSize !== null) {
      const n = parseInt(rawSize, 10);
      if (Number.isFinite(n)) size = Math.min(50, Math.max(1, n));
    }

    const data = await fetchUserEventsExternal(username, page, size);
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (e) {
    return handleApiError(e, "/api/users/[username]/events", {
      fallbackData: {
        content: [],
        currentPage: 0,
        pageSize: 12,
        totalElements: 0,
        totalPages: 0,
        last: true,
      },
    });
  }
}

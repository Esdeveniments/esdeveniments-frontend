import { NextResponse } from "next/server";
import { fetchFavoriteEventsExternal } from "@lib/api/favorites-external";
import { handleApiError } from "@utils/api-error-handler";

// GET /api/users/me/favorites/events - the signed-in user's favourite events.
// Reads the Bearer token from the request and forwards it to the backend.
export async function GET(request: Request) {
  try {
    const token = request.headers
      .get("Authorization")
      ?.replace(/^Bearer\s+/i, "");
    if (!token) {
      return NextResponse.json(
        { error: "Authorization token required" },
        { status: 401 },
      );
    }

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

    const data = await fetchFavoriteEventsExternal(token, page, size);
    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return handleApiError(e, "/api/users/me/favorites/events", {
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

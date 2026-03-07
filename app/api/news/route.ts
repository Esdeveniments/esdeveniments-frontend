import { NextResponse } from "next/server";
import { fetchNewsExternal } from "@lib/api/news-external";
import { handleApiError } from "@utils/api-error-handler";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = url.searchParams.get("page");
    const size = url.searchParams.get("size");
    const place = url.searchParams.get("place") || undefined;
    const data = await fetchNewsExternal({
      page: page ? parseInt(page, 10) : undefined,
      size: size ? parseInt(size, 10) : undefined,
      place,
    });
    return NextResponse.json(data, {
      status: 200,
      headers: {
        // s-maxage=600: news articles are rarely updated within 10 min.
        // swr=1800: serve stale instantly for 20 min after expiry.
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
      },
    });
  } catch (e) {
    return handleApiError(e, "/api/news", {
      fallbackData: {
        content: [],
        currentPage: 0,
        pageSize: 0,
        totalElements: 0,
        totalPages: 0,
        last: true,
      },
    });
  }
}

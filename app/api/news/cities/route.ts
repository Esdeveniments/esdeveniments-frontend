import { NextResponse } from "next/server";
import { fetchNewsCitiesExternal } from "@lib/api/news-external";
import { handleApiError } from "@utils/api-error-handler";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = url.searchParams.get("page");
    const size = url.searchParams.get("size");

    const data = await fetchNewsCitiesExternal({
      page: page ? parseInt(page, 10) : undefined,
      size: size ? parseInt(size, 10) : undefined,
    });

    return NextResponse.json(data, {
      status: 200,
      headers: {
        // Cities list changes infrequently; cache longer than news list.
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    return handleApiError(e, "/api/news/cities", {
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

import { NextResponse } from "next/server";
import { fetchNewsExternal } from "@lib/api/news-external";

export const runtime = "nodejs";

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
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60",
      },
    });
  } catch (e) {
    console.error("/api/news error", e);
    return NextResponse.json(
      {
        content: [],
        currentPage: 0,
        pageSize: 0,
        totalElements: 0,
        totalPages: 0,
        last: true,
      },
      { status: 500 }
    );
  }
}


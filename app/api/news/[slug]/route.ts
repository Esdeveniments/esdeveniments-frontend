import { NextResponse } from "next/server";
import { fetchNewsBySlugExternal } from "@lib/api/news-external";
import { handleApiError } from "@utils/api-error-handler";
import { createKeyedCache } from "@lib/api/cache";
import type { NewsDetailResponseDTO } from "types/api/news";

// Cache for news detail by slug (24h TTL) to prevent backend visit increments on refresh
const { cache: newsDetailCache } =
  createKeyedCache<NewsDetailResponseDTO | null>(
    86400000 // 24 hours
  );

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await ctx.params;
    // Use cache to prevent hitting backend on every request (which increments visits)
    const data = await newsDetailCache(slug, async (key) => {
      return await fetchNewsBySlugExternal(key as string);
    });
    if (!data) return NextResponse.json(null, { status: 404 });
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60",
      },
    });
  } catch (e) {
    return handleApiError(e, "/api/news/[slug]", {
      fallbackData: null,
    });
  }
}

import { NextResponse } from "next/server";
import { fetchNewsBySlugExternal } from "@lib/api/news-external";
import { handleApiError } from "@utils/api-error-handler";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await ctx.params;
    const data = await fetchNewsBySlugExternal(slug);
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


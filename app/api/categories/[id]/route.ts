import { NextResponse } from "next/server";
import { fetchCategoryByIdExternal } from "@lib/api/categories-external";
import { handleApiError } from "@utils/api-error-handler";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const data = await fetchCategoryByIdExternal(id);
    if (!data) return NextResponse.json(null, { status: 404 });
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    return handleApiError(e, "/api/categories/[id]", {
      fallbackData: null,
    });
  }
}


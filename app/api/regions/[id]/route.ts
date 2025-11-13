import { NextResponse } from "next/server";
import { fetchRegionByIdExternal } from "@lib/api/regions-external";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const data = await fetchRegionByIdExternal(id);
    if (!data) return NextResponse.json(null, { status: 404 });
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    console.error("/api/regions/[id] error", e);
    return NextResponse.json(null, { status: 500 });
  }
}


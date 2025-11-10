import { NextResponse } from "next/server";
import { fetchPlaceBySlugExternal } from "@lib/api/places-external";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await ctx.params;
    const data = await fetchPlaceBySlugExternal(slug);
    if (!data) return NextResponse.json(null, { status: 404 });
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    console.error("/api/places/[slug] error", e);
    return NextResponse.json(null, { status: 500 });
  }
}


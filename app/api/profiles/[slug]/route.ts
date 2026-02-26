import { NextResponse } from "next/server";
import { fetchProfileBySlugExternal } from "@lib/api/profiles-external";
import { handleApiError } from "@utils/api-error-handler";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const profile = await fetchProfileBySlugExternal(slug);

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(profile, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=60",
      },
    });
  } catch (e) {
    return handleApiError(e, "/api/profiles/[slug]");
  }
}

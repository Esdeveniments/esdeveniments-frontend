import { NextRequest } from "next/server";
import { fetchNewsBySlug } from "@lib/api/news";
import { assertValidNewsRange } from "@utils/news-date";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug;
  const { searchParams } = request.nextUrl;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!slug) {
    return Response.json({ message: "Missing slug" }, { status: 400 });
  }

  if (!startDate || !endDate) {
    return Response.json(
      { message: "startDate and endDate are required (YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  try {
    // Validate allowed blocks (inclusive boundaries)
    const type = assertValidNewsRange(startDate, endDate);
    // Only fetch by full slug (no migratedId or WIT lookup)
    const data = await fetchNewsBySlug(slug);
    if (!data) {
      return Response.json({ message: "Not found" }, { status: 404 });
    }

    // Optionally align returned type to validation outcome
    const normalized = { ...data, type };
    return Response.json(normalized, { status: 200 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Invalid date range";
    return Response.json({ message }, { status: 400 });
  }
}
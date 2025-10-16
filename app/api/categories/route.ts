import { NextResponse } from "next/server";
import { fetchCategories } from "@lib/api/categories";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await fetchCategories();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    console.error("/api/categories error", e);
    return NextResponse.json(
      { error: "Failed to load categories" },
      { status: 500 }
    );
  }
}

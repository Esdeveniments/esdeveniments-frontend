import { NextRequest } from "next/server";
import { fetchNews } from "@lib/api/news";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = Number(searchParams.get("page") || 0);
  const size = Number(searchParams.get("size") || 100);
  const place = searchParams.get("place") || undefined;

  const data = await fetchNews({ page, size, place });
  return Response.json(data, { status: 200 });
}
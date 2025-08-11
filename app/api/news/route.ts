import { NextRequest } from "next/server";
import { fetchNews } from "@lib/api/news";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const pageParam = searchParams.get("page");
  const sizeParam = searchParams.get("size");
  const page = pageParam === null ? 0 : Number(pageParam);
  const size = sizeParam === null ? 100 : Number(sizeParam);

  if (Number.isNaN(page) || Number.isNaN(size) || page < 0 || size < 1) {
    return Response.json({ message: "Invalid page or size parameters" }, { status: 400 });
  }

  const place = searchParams.get("place") || undefined;

  const data = await fetchNews({ page, size, place });
  return Response.json(data, { status: 200 });
}
import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, toggleFavoriteDb } from "@lib/server/db";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  const user = await getUserBySessionToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slug } = await req.json();
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  const isFavorite = await toggleFavoriteDb(user.id, slug);
  return NextResponse.json({ isFavorite });
}
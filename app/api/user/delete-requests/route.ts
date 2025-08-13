import { NextRequest, NextResponse } from "next/server";
import { addDeleteRequest, getOwnership, getUserBySessionToken } from "@lib/server/db";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  const user = await getUserBySessionToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slug, reason } = await req.json();
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  const owned = await getOwnership(user.id);
  if (!owned.includes(slug)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await addDeleteRequest(slug, user.id, reason);
  return NextResponse.json({ ok: true });
}
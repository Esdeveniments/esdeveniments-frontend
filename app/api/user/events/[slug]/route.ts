import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, removeOwnership } from "@lib/server/db";

export async function DELETE(req: NextRequest, { params }: { params: { slug: string } }) {
  const token = req.cookies.get("session")?.value;
  const user = await getUserBySessionToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const slug = params.slug;
  await removeOwnership(user.id, slug);
  return NextResponse.json({ ok: true });
}
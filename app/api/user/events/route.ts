import { NextRequest, NextResponse } from "next/server";
import { addOwnership, getOwnership, getUserBySessionToken } from "@lib/server/db";
import { fetchEventBySlug } from "@lib/api/events";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  const user = await getUserBySessionToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const slugs = await getOwnership(user.id);
  const results = await Promise.all(
    slugs.map(async (slug) => {
      try {
        const ev = await fetchEventBySlug(slug);
        return { slug, title: ev?.title || slug };
      } catch {
        return { slug, title: slug };
      }
    })
  );
  return NextResponse.json({ events: results });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  const user = await getUserBySessionToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slug } = await req.json();
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  await addOwnership(user.id, slug);
  return NextResponse.json({ ok: true });
}
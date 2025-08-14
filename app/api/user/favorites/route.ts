import { NextRequest, NextResponse } from "next/server";
import { getFavorites, getUserBySessionToken } from "@lib/server/db";
import { fetchEventBySlug } from "@lib/api/events";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  const user = await getUserBySessionToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const slugs = await getFavorites(user.id);
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
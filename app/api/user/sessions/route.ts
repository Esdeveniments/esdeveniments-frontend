import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, listSessions, revokeSession } from "@lib/server/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  const user = await getUserBySessionToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sessions = await listSessions(user.id);
  return NextResponse.json({ sessions: sessions.map(({ token, createdAt, expiresAt }) => ({ token, createdAt, expiresAt })) });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  const user = await getUserBySessionToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { token: revokeToken } = await req.json();
  if (!revokeToken) return NextResponse.json({ error: "Missing token" }, { status: 400 });
  await revokeSession(user.id, revokeToken);
  return NextResponse.json({ ok: true });
}
import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken, readDb, writeDb } from "@lib/server/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  const user = await getUserBySessionToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readDb();
  const exportData = {
    user,
    ownership: db.ownership[user.id] || [],
    favorites: db.favorites[user.id] || [],
    sessions: db.sessions.filter((s) => s.userId === user.id),
  };
  return NextResponse.json(exportData);
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  const user = await getUserBySessionToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await readDb();
  // Remove user data
  db.users = db.users.filter((u) => u.id !== user.id);
  delete db.ownership[user.id];
  delete db.favorites[user.id];
  db.sessions = db.sessions.filter((s) => s.userId !== user.id);
  // Note: we keep deleteRequests and coowners referencing this user as history, or clean if desired
  await writeDb(db);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", "", { httpOnly: true, expires: new Date(0), path: "/" });
  return res;
}
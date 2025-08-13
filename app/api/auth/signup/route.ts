import { NextRequest, NextResponse } from "next/server";
import { createSession, findOrCreateUser } from "@lib/server/db";

export async function POST(req: NextRequest) {
  const { name, email } = await req.json();
  if (!name || !email) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const user = await findOrCreateUser(name, email);
  const token = await createSession(user.id);
  const res = NextResponse.json({ user });
  res.cookies.set("session", token, { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
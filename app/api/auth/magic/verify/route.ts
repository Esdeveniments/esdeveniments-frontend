import { NextRequest, NextResponse } from "next/server";
import { createSession, findOrCreateUser, useMagicToken } from "@lib/server/db";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });
  const email = await useMagicToken(token);
  if (!email) return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  const name = email.split("@")[0];
  const user = await findOrCreateUser(name, email);
  const session = await createSession(user.id);
  const res = NextResponse.redirect(new URL("/dashboard", req.url));
  res.cookies.set("session", session, { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
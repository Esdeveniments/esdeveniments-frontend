import { NextRequest, NextResponse } from "next/server";
import { createSession, findOrCreateUser } from "@lib/server/db";
import { isRateLimited, rateLimitKey, validateCsrf } from "@app/api/utils/security";
import { verifyTurnstile } from "@app/api/auth/turnstile";

export async function POST(req: NextRequest) {
  if (!validateCsrf(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const key = rateLimitKey(req);
  if (isRateLimited(key)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const ok = await verifyTurnstile(req, body.cfToken);
  if (!ok) return NextResponse.json({ error: "Captcha failed" }, { status: 400 });

  const { name, email } = body;
  if (!name || !email) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const user = await findOrCreateUser(name, email);
  const token = await createSession(user.id);
  const res = NextResponse.json({ user });
  res.cookies.set("session", token, { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
import { NextRequest, NextResponse } from "next/server";
import { createMagicToken } from "@lib/server/db";
import { isRateLimited, rateLimitKey, validateCsrf } from "@app/api/utils/security";
import { verifyTurnstile } from "@app/api/auth/turnstile";

export async function POST(req: NextRequest) {
  if (!validateCsrf(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const key = rateLimitKey(req);
  if (isRateLimited(key)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json();
  const ok = await verifyTurnstile(req, body.cfToken);
  if (!ok) return NextResponse.json({ error: "Captcha failed" }, { status: 400 });

  const { email } = body;
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });
  const token = await createMagicToken(email);
  const url = new URL(`/api/auth/magic/verify?token=${token.token}`, req.url).toString();
  return NextResponse.json({ ok: true, verifyUrl: url });
}
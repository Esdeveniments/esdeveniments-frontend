import { NextRequest, NextResponse } from "next/server";
import { createMagicToken } from "@lib/server/db";
import { isRateLimited, rateLimitKey, validateCsrf } from "@app/api/utils/security";

export async function POST(req: NextRequest) {
  if (!validateCsrf(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const key = rateLimitKey(req);
  if (isRateLimited(key)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });
  const token = await createMagicToken(email);
  const url = new URL(`/api/auth/magic/verify?token=${token.token}`, req.url).toString();
  // In dev, return the link; in prod, you would email it.
  return NextResponse.json({ ok: true, verifyUrl: url });
}
import { NextRequest, NextResponse } from "next/server";
import { createMagicToken } from "@lib/server/db";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });
  const token = await createMagicToken(email);
  const url = new URL(`/api/auth/magic/verify?token=${token.token}`, req.url).toString();
  // In dev, return the link; in prod, you would email it.
  return NextResponse.json({ ok: true, verifyUrl: url });
}
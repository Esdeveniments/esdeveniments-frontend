import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@lib/server/db";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  await deleteSession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", "", { httpOnly: true, expires: new Date(0), path: "/" });
  return res;
}
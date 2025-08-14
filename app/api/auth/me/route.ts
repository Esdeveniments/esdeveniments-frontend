import { NextRequest, NextResponse } from "next/server";
import { getUserBySessionToken } from "@lib/server/db";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("session")?.value;
  const user = await getUserBySessionToken(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ user });
}
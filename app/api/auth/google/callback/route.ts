import { NextRequest, NextResponse } from "next/server";
import { consumeOauthState, createSession, findOrCreateUser } from "@lib/server/db";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || !state) return NextResponse.json({ error: "Missing code/state" }, { status: 400 });
  const okState = await consumeOauthState(state);
  if (!okState) return NextResponse.json({ error: "Invalid state" }, { status: 400 });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || new URL("/api/auth/google/callback", req.url).toString();
  if (!clientId || !clientSecret) return NextResponse.json({ error: "Missing Google env" }, { status: 500 });

  // Exchange code
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return NextResponse.json({ error: "Token exchange failed" }, { status: 400 });
  const tokens = await tokenRes.json();

  // Get userinfo
  const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userinfoRes.ok) return NextResponse.json({ error: "Userinfo failed" }, { status: 400 });
  const userinfo = await userinfoRes.json();
  const email = userinfo.email as string;
  const name = (userinfo.name as string) || email.split("@")[0];

  const user = await findOrCreateUser(name, email);
  const session = await createSession(user.id);
  const res = NextResponse.redirect(new URL("/dashboard", req.url));
  res.cookies.set("session", session, { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
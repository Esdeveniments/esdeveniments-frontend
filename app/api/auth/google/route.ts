import { NextRequest, NextResponse } from "next/server";
import { saveOauthState } from "@lib/server/db";

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || new URL("/api/auth/google/callback", req.url).toString();
  if (!clientId) return NextResponse.json({ error: "Missing GOOGLE_CLIENT_ID" }, { status: 500 });
  const state = crypto.randomUUID();
  await saveOauthState(state);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "offline",
    prompt: "consent",
  });
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return NextResponse.redirect(url);
}
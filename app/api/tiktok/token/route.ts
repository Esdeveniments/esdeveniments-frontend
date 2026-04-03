import { NextResponse } from "next/server";

const TIKTOK_TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";

/**
 * POST /api/tiktok/token
 * Exchange an OAuth authorization code for a TikTok access token.
 * Keeps TIKTOK_CLIENT_SECRET server-side.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      code?: string;
      redirect_uri?: string;
      code_verifier?: string;
    };

    if (!body.code || !body.redirect_uri || !body.code_verifier) {
      return NextResponse.json(
        { error: "Missing code, redirect_uri, or code_verifier" },
        { status: 400 },
      );
    }

    const clientKey = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;

    if (!clientKey || !clientSecret) {
      return NextResponse.json(
        { error: "TikTok credentials not configured on server" },
        { status: 500 },
      );
    }

    const params = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code: body.code,
      grant_type: "authorization_code",
      redirect_uri: body.redirect_uri,
      code_verifier: body.code_verifier,
    });

    const res = await fetch(TIKTOK_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: AbortSignal.timeout(10_000),
    });

    const data = (await res.json()) as Record<string, unknown>;

    if (data.error || !data.access_token) {
      return NextResponse.json(
        {
          error:
            (data.error_description as string) ||
            (data.error as string) ||
            "Token exchange failed",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      access_token: data.access_token,
      open_id: data.open_id,
      expires_in: data.expires_in,
    });
  } catch (e) {
    console.error("TikTok token exchange error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

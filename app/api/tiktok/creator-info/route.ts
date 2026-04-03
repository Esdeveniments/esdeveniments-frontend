import { NextResponse } from "next/server";

const TIKTOK_CREATOR_INFO_URL =
  "https://open.tiktokapis.com/v2/post/publish/creator_info/query/";

/**
 * POST /api/tiktok/creator-info
 * Proxy to TikTok's creator info endpoint.
 * Required UX point 1: display creator info, limits, and available privacy options.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { access_token?: string };

    if (!body.access_token) {
      return NextResponse.json(
        { error: "Missing access_token" },
        { status: 400 },
      );
    }

    const res = await fetch(TIKTOK_CREATOR_INFO_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${body.access_token}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      signal: AbortSignal.timeout(10_000),
    });

    const data: unknown = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    console.error("TikTok creator info error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

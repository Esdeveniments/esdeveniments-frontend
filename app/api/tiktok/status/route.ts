import { NextResponse } from "next/server";

const TIKTOK_STATUS_URL =
  "https://open.tiktokapis.com/v2/post/publish/status/fetch/";

/**
 * POST /api/tiktok/status
 * Proxy to TikTok's publish status endpoint.
 * Used for UX point 5: post-publish status polling.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      access_token?: string;
      publish_id?: string;
    };

    if (!body.access_token || !body.publish_id) {
      return NextResponse.json(
        { error: "Missing access_token or publish_id" },
        { status: 400 },
      );
    }

    const res = await fetch(TIKTOK_STATUS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${body.access_token}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ publish_id: body.publish_id }),
      signal: AbortSignal.timeout(10_000),
    });

    const data: unknown = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    console.error("TikTok status check error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

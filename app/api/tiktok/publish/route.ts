import { NextResponse } from "next/server";

const TIKTOK_PUBLISH_URL =
  "https://open.tiktokapis.com/v2/post/publish/video/init/";

/**
 * POST /api/tiktok/publish
 * Proxy to TikTok's Direct Post init endpoint.
 * Returns publish_id and upload_url for FILE_UPLOAD source.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      access_token?: string;
      post_info?: Record<string, unknown>;
      source_info?: Record<string, unknown>;
    };

    if (!body.access_token || !body.post_info || !body.source_info) {
      return NextResponse.json(
        { error: "Missing access_token, post_info, or source_info" },
        { status: 400 },
      );
    }

    const res = await fetch(TIKTOK_PUBLISH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${body.access_token}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        post_info: body.post_info,
        source_info: body.source_info,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const data: unknown = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    console.error("TikTok publish init error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

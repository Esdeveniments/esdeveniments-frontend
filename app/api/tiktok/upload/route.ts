import { NextResponse } from "next/server";

/**
 * POST /api/tiktok/upload
 * Proxy video binary to TikTok's upload URL (returned by /publish/video/init/).
 * Avoids CORS issues with direct browser → TikTok uploads.
 *
 * Headers:
 *   x-tiktok-upload-url  — the upload_url from init response
 *   x-tiktok-content-type — video MIME type (default: video/mp4)
 */
export async function POST(request: Request) {
  try {
    const uploadUrl = request.headers.get("x-tiktok-upload-url");
    const contentType =
      request.headers.get("x-tiktok-content-type") || "video/mp4";

    if (!uploadUrl) {
      return NextResponse.json(
        { error: "Missing x-tiktok-upload-url header" },
        { status: 400 },
      );
    }

    const body = await request.arrayBuffer();
    const totalSize = body.byteLength;

    if (totalSize === 0) {
      return NextResponse.json(
        { error: "Empty request body" },
        { status: 400 },
      );
    }

    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(totalSize),
        "Content-Range": `bytes 0-${totalSize - 1}/${totalSize}`,
      },
      body: body,
      signal: AbortSignal.timeout(120_000), // 2 min for video upload
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      return NextResponse.json(
        { error: `Upload failed: ${res.status} ${errText}` },
        { status: res.status },
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("TikTok upload error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

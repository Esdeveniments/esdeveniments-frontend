/**
 * Places Photo proxy route (Places API v1 only)
 *
 * Query params:
 *  - name: Places API v1 photo resource name (required)
 *  - w:    max width (50..800, default 400)
 *  - h:    max height (optional 50..800)
 */

import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

// 1x1 transparent PNG (base64) to serve as safe fallback
const TRANSPARENT_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const nameParam = url.searchParams.get("name") || ""; // v1 photo resource name
  const wParam = parseInt(url.searchParams.get("w") || "400", 10);
  const hParam = parseInt(url.searchParams.get("h") || "0", 10);

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return buildPlaceholderResponse();
  }

  // Clamp dimensions for safety
  const maxwidth = Math.min(Math.max(wParam, 50), 800);
  const maxheight =
    hParam > 0 ? Math.min(Math.max(hParam, 50), 800) : undefined;
  if (
    !/^places\/[A-Za-z0-9_\-:.]+\/photos\/[A-Za-z0-9_\-:.]+$/.test(nameParam)
  ) {
    return NextResponse.json({ error: "Invalid name" }, { status: 400 });
  }
  const v1 = new URL(`https://places.googleapis.com/v1/${nameParam}/media`);
  v1.searchParams.set("maxWidthPx", String(maxwidth));
  if (maxheight) v1.searchParams.set("maxHeightPx", String(maxheight));
  v1.searchParams.set("key", apiKey);
  const fetchUrl = v1.toString();

  try {
    // Follow redirects to get the actual image bytes
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      return buildPlaceholderResponse();
    }

    // Some responses may still redirect via Location header; fetch handles this by default.
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // Cache for 1 day; immutable since photo_reference is stable
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (error) {
    // Log and capture to Sentry, but still return placeholder to avoid breaking UI
    // Log locally (sanitized) and capture a sanitized Sentry event in production.
    // Avoid sending the raw error object to Sentry to prevent leaking sensitive data.
    console.error("Places photo fetch error", {
      message: error && (error as any).message ? (error as any).message : String(error),
    });
    if (process.env.NODE_ENV === "production") {
      Sentry.withScope((scope) => {
        scope.setTag("route", "/api/places/photo");
        scope.setTag("type", "photo_fetch_error");
        // Capture a generic message rather than the raw error object to avoid leaking sensitive data.
        Sentry.captureMessage("Places photo fetch error", Sentry.Severity.Error);
      });
    }
    }
    return buildPlaceholderResponse();
  }
}

function buildPlaceholderResponse(): NextResponse {
  return new NextResponse(Buffer.from(TRANSPARENT_PNG_BASE64, "base64"), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

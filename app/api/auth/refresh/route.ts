import { NextResponse } from "next/server";
import { refreshTokenExternal } from "@lib/api/auth-external";
import { handleApiError } from "@utils/api-error-handler";
import { createRateLimiter } from "@utils/rate-limit";

const limiter = createRateLimiter({ maxRequests: 10, windowMs: 15 * 60 * 1000 });

export async function POST(request: Request): Promise<Response> {
  const blocked = limiter.check(request);
  if (blocked) return blocked;

  try {
    let body: { refreshToken?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token is required" },
        { status: 400 }
      );
    }

    const { data, error, status } = await refreshTokenExternal(refreshToken);

    if (error || !data) {
      return NextResponse.json(
        { error: error ?? "unknown" },
        { status: status === 200 ? 500 : status }
      );
    }

    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return handleApiError(e, "/api/auth/refresh");
  }
}

import { NextResponse } from "next/server";
import { refreshTokenExternal } from "@lib/api/auth-external";
import { handleApiError } from "@utils/api-error-handler";
import { createRateLimiter } from "@utils/rate-limit";
import {
  getRefreshTokenFromCookies,
  setAuthCookies,
  clearAuthCookies,
} from "@utils/auth-cookies";

const limiter = createRateLimiter({ maxRequests: 10, windowMs: 15 * 60 * 1000 });

export async function POST(request: Request): Promise<Response> {
  const blocked = limiter.check(request);
  if (blocked) return blocked;

  try {
    const refreshToken = await getRefreshTokenFromCookies();

    if (!refreshToken) {
      return NextResponse.json(
        { error: "Refresh token is required" },
        { status: 401 }
      );
    }

    const { data, error, status } = await refreshTokenExternal(refreshToken);

    if (error || !data) {
      // Clear stale cookies on refresh failure
      const errorResponse = NextResponse.json(
        { error: error ?? "unknown" },
        { status: status === 200 ? 500 : status }
      );
      clearAuthCookies(errorResponse);
      return errorResponse;
    }

    const response = NextResponse.json(
      { expiresAt: data.expiresAt },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );

    setAuthCookies(
      response,
      data.accessToken,
      data.expiresAt,
      data.refreshToken
    );

    return response;
  } catch (e) {
    return handleApiError(e, "/api/auth/refresh");
  }
}

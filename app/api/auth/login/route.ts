import { NextResponse } from "next/server";
import { loginExternal } from "@lib/api/auth-external";
import { handleApiError } from "@utils/api-error-handler";
import { createRateLimiter } from "@utils/rate-limit";
import { setAuthCookies } from "@utils/auth-cookies";
import type { LoginRequestDTO } from "types/api/auth";

const limiter = createRateLimiter({ maxRequests: 5, windowMs: 15 * 60 * 1000 });

export async function POST(request: Request): Promise<Response> {
  const blocked = limiter.check(request);
  if (blocked) return blocked;

  try {
    let body: LoginRequestDTO;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const { data, error, status } = await loginExternal(email, password);

    if (error || !data) {
      return NextResponse.json(
        { error: error ?? "unknown" },
        { status: status === 200 ? 500 : status }
      );
    }

    // Set HttpOnly cookies — tokens never reach the client
    const response = NextResponse.json(
      { user: data.user, expiresAt: data.expiresAt },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );

    setAuthCookies(response, data.accessToken, data.expiresAt, data.refreshToken);

    return response;
  } catch (e) {
    return handleApiError(e, "/api/auth/login");
  }
}

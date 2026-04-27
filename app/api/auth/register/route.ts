import { NextResponse } from "next/server";
import { registerExternal } from "@lib/api/auth-external";
import { handleApiError } from "@utils/api-error-handler";
import { createRateLimiter } from "@utils/rate-limit";
import type { RegisterRequestDTO } from "types/api/auth";

const limiter = createRateLimiter({ maxRequests: 3, windowMs: 15 * 60 * 1000 });

export async function POST(request: Request): Promise<Response> {
  const blocked = limiter.check(request);
  if (blocked) return blocked;

  try {
    let body: RegisterRequestDTO;
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

    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    const { data, error, status } = await registerExternal(email, password, name);

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
    return handleApiError(e, "/api/auth/register");
  }
}

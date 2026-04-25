import { NextResponse } from "next/server";
import { loginExternal } from "@lib/api/auth-external";
import { handleApiError } from "@utils/api-error-handler";
import type { LoginRequestDTO } from "types/api/auth";

export async function POST(request: Request): Promise<Response> {
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

    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return handleApiError(e, "/api/auth/login");
  }
}

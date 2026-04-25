import { NextResponse } from "next/server";
import { resetPasswordExternal } from "@lib/api/auth-external";
import { handleApiError } from "@utils/api-error-handler";

export async function POST(request: Request): Promise<Response> {
  try {
    let body: { token?: string; newPassword?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "Token and new password are required" },
        { status: 400 }
      );
    }

    const { data, error, status } = await resetPasswordExternal(token, newPassword);

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
    return handleApiError(e, "/api/auth/password/reset");
  }
}

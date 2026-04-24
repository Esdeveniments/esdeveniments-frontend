import { NextResponse } from "next/server";
import { resendVerificationExternal } from "@lib/api/auth-external";
import { handleApiError } from "@utils/api-error-handler";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body as { email?: string };

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const { data, error, status } = await resendVerificationExternal(email);

    if (error || !data) {
      return NextResponse.json({ error: error ?? "unknown" }, { status });
    }

    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return handleApiError(e, "/api/auth/verification/resend");
  }
}

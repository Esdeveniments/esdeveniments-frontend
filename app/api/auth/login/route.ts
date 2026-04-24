import { NextResponse } from "next/server";
import { loginExternal } from "@lib/api/auth-external";
import { handleApiError } from "@utils/api-error-handler";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const { data, error, status } = await loginExternal(email, password);

    if (error || !data) {
      return NextResponse.json({ error: error ?? "unknown" }, { status });
    }

    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return handleApiError(e, "/api/auth/login");
  }
}

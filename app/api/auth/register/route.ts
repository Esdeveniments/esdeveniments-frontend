import { NextResponse } from "next/server";
import { registerExternal } from "@lib/api/auth-external";
import { handleApiError } from "@utils/api-error-handler";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name } = body as {
      email?: string;
      password?: string;
      name?: string;
    };

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    const { data, error, status } = await registerExternal(email, password, name);

    if (error || !data) {
      return NextResponse.json({ error: error ?? "unknown" }, { status });
    }

    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return handleApiError(e, "/api/auth/register");
  }
}

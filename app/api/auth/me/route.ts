import { NextResponse } from "next/server";
import { getMeExternal } from "@lib/api/auth-external";
import { handleApiError } from "@utils/api-error-handler";
import { getAccessTokenFromCookies } from "@utils/auth-cookies";

export async function GET(): Promise<Response> {
  try {
    const token = await getAccessTokenFromCookies();

    if (!token) {
      return NextResponse.json(
        { error: "Authorization token required" },
        { status: 401 }
      );
    }

    const user = await getMeExternal(token);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    return NextResponse.json(user, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return handleApiError(e, "/api/auth/me");
  }
}

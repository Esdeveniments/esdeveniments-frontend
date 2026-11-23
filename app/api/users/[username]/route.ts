import { NextResponse } from "next/server";
import { getUserByUsernameExternalResult } from "@lib/api/users-external";
import { handleApiError } from "@utils/api-error-handler";

// GET /api/users/[username] - browser-facing proxy with server-side HMAC and caching
export async function GET(
  _request: Request,
  context: RouteContext<"/api/users/[username]">
) {
  try {
    const { username } = await context.params;
    const { data: user, error, status } =
      await getUserByUsernameExternalResult(username);

    if (error) {
      return NextResponse.json(
        { error: "Failed to load profile" },
        {
          status: status !== null && status >= 400 ? status : 502,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }

    // 404s use no-store to avoid negative caching — a newly registered user
    // would otherwise see a cached 404.
    const headers: Record<string, string> =
      user
        ? { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800" }
        : { "Cache-Control": "no-store" };

    return NextResponse.json(user ?? null, {
      status: user ? 200 : 404,
      headers,
    });
  } catch (e) {
    return handleApiError(e, "/api/users/[username]", {
      fallbackData: null,
    });
  }
}

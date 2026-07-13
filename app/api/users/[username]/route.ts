import { NextResponse } from "next/server";
import { getUserByUsernameExternal } from "@lib/api/users-external";
import { handleApiError } from "@utils/api-error-handler";
import type { UserPublicResponseDTO } from "types/api/user";

// GET /api/users/[username] - server-only proxy with server-side HMAC and caching
export async function GET(
  _request: Request,
  context: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await context.params;
    const user: UserPublicResponseDTO | null =
      await getUserByUsernameExternal(username);

    const headers: Record<string, string> = {};
    if (user) {
      headers["Cache-Control"] =
        "public, s-maxage=1800, stale-while-revalidate=1800";
    }

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

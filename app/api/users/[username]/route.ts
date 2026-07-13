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

    // Avoid CDN/browser caching for user data: profiles can change (avatar,
    // join date, etc.) and this is a low-traffic endpoint, so freshness beats
    // cache hit rate.
    const headers: Record<string, string> = {
      "Cache-Control": "no-store",
    };

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

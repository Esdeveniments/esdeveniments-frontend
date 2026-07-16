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

    // Cache successful 200 responses with a short TTL so the internal fetch
    // in fetchUserBySlug (next: { revalidate }) can cache. 404s use no-store
    // to avoid negative caching — a newly registered user would otherwise see
    // a cached 404 for up to 30 min.
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

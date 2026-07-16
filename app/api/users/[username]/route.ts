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

    // Short TTL with stale-while-revalidate so the internal fetch in
    // fetchUserBySlug (next: { revalidate }) can cache. Profiles can change
    // (avatar, join date) so we keep the TTL short (5 min) and allow stale
    // serving for up to 30 min while revalidating.
    const headers: Record<string, string> = {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800",
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

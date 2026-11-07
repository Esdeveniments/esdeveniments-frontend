import { NextResponse } from "next/server";
import { searchUsersExternal } from "@lib/api/users-external";
import { handleApiError } from "@utils/api-error-handler";
import { hasSearchableToken, searchTokens } from "@utils/search-query";
import { SEARCH_QUERY_MAX_LENGTH, USER_SEARCH_SIZE } from "@config/search";

const NO_STORE = { "Cache-Control": "no-store" };
const CACHED = {
  "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
};

function parseSize(raw: string | null): number | null {
  if (raw === null) return USER_SEARCH_SIZE.default;
  if (!/^\d+$/.test(raw)) return null;
  const size = Number(raw);
  return size >= USER_SEARCH_SIZE.min && size <= USER_SEARCH_SIZE.max ? size : null;
}

// GET /api/users?q=&size= - profile search suggestions (backend#59), with the
// backend's own input rules so a bad request never reaches it.
export async function GET(request: Request) {
  // Outside the try: during `next build` this throws Next's prerender bail-out,
  // which must propagate instead of being logged as an API error.
  const { searchParams } = new URL(request.url);
  try {
    const q = searchParams.get("q");
    const size = parseSize(searchParams.get("size"));
    if (q === null || q.length > SEARCH_QUERY_MAX_LENGTH || size === null) {
      return NextResponse.json(
        { error: "Invalid q or size" },
        { status: 400, headers: NO_STORE },
      );
    }
    if (!hasSearchableToken(searchTokens(q))) {
      return NextResponse.json([], { headers: CACHED });
    }

    const users = await searchUsersExternal(q, size);
    if (!users) {
      return NextResponse.json(
        { error: "Profile search unavailable" },
        { status: 502, headers: NO_STORE },
      );
    }
    return NextResponse.json(users, { headers: CACHED });
  } catch (e) {
    const response = handleApiError(e, "/api/users", { fallbackData: [] });
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}

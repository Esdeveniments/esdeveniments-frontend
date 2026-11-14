import { NextResponse } from "next/server";
import { getUserEventsExternalResult } from "@lib/api/users-external";
import { handleApiError } from "@utils/api-error-handler";
import type { ProfileEventStatus } from "types/api/event";

const MAX_PAGE_SIZE = 50;
const NO_STORE = { "Cache-Control": "no-store" };

function parseStatus(value: string | null): ProfileEventStatus | null {
  return value === "upcoming" || value === "past" ? value : null;
}

function parseIntInRange(value: string | null, min: number, max: number, fallback: number): number {
  const n = value === null ? NaN : parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

// GET /api/users/[username]/events?status=upcoming|past&page=&size=
// The profile's "load more"; the first page is rendered on the server.
export async function GET(
  request: Request,
  context: RouteContext<"/api/users/[username]/events">,
) {
  try {
    const { username } = await context.params;
    const search = new URL(request.url).searchParams;
    const status = parseStatus(search.get("status"));
    if (!status) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400, headers: NO_STORE });
    }
    const page = parseIntInRange(search.get("page"), 0, Number.MAX_SAFE_INTEGER, 0);
    const size = parseIntInRange(search.get("size"), 1, MAX_PAGE_SIZE, 20);

    const result = await getUserEventsExternalResult(username, page, size, status);
    if (!result.data) {
      // getUserEventsExternalResult already logged it; keep failures out of the CDN.
      const code = result.status === 404 ? 404 : 502;
      return NextResponse.json({ error: "User events unavailable" }, { status: code, headers: NO_STORE });
    }
    return NextResponse.json(result.data, {
      headers: {
        // Same TTLs as /api/events: events are published days ahead.
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (e) {
    const response = handleApiError(e, "/api/users/[username]/events", {
      errorMessage: "User events unavailable",
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}

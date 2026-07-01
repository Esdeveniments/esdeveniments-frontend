import { NextResponse } from "next/server";
import {
  getFavoriteStatusExternal,
  setFavoriteExternal,
} from "@lib/api/favorites-external";
import { handleApiError } from "@utils/api-error-handler";

function getToken(request: Request): string | undefined {
  return request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
}

const unauthorized = () =>
  NextResponse.json({ error: "Authorization token required" }, { status: 401 });

// GET - whether the signed-in user has favourited this event.
export async function GET(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  try {
    const token = getToken(request);
    if (!token) return unauthorized();
    const { eventId } = await context.params;
    const favorite = await getFavoriteStatusExternal(token, eventId);
    return NextResponse.json(
      { favorite },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return handleApiError(e, "/api/users/me/favorites/events/[eventId]", {
      fallbackData: { favorite: false },
    });
  }
}

// POST - add this event to favourites.
export async function POST(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  try {
    const token = getToken(request);
    if (!token) return unauthorized();
    const { eventId } = await context.params;
    const ok = await setFavoriteExternal(token, eventId, true);
    if (!ok) {
      return NextResponse.json({ error: "favorite-failed" }, { status: 502 });
    }
    return NextResponse.json({ favorite: true }, { status: 200 });
  } catch (e) {
    return handleApiError(e, "/api/users/me/favorites/events/[eventId]");
  }
}

// DELETE - remove this event from favourites.
export async function DELETE(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  try {
    const token = getToken(request);
    if (!token) return unauthorized();
    const { eventId } = await context.params;
    const ok = await setFavoriteExternal(token, eventId, false);
    if (!ok) {
      return NextResponse.json({ error: "favorite-failed" }, { status: 502 });
    }
    return NextResponse.json({ favorite: false }, { status: 200 });
  } catch (e) {
    return handleApiError(e, "/api/users/me/favorites/events/[eventId]");
  }
}

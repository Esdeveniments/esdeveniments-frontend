import { NextResponse } from "next/server";
import { z } from "zod";
import { captureException } from "@sentry/nextjs";
import { MAX_FAVORITES } from "@utils/constants";

import {
  getFavoritesFromCookies,
  persistFavoritesCookie,
} from "@utils/favorites";
import { getAccessTokenFromCookies } from "@utils/auth-cookies";
import {
  addFavoriteEventExternal,
  listFavoriteEventsExternal,
  removeFavoriteEventExternal,
} from "@lib/api/favorites-external";

const ToggleFavoriteSchema = z.object({
  eventSlug: z
    .string()
    .trim()
    .min(1, { message: "Event slug cannot be empty" }),
  // Optional for backward compat: cookie path keys by slug, backend path
  // keys by id. Both are required for the authed branch to work.
  eventId: z.string().trim().min(1).optional(),
  shouldBeFavorite: z.boolean(),
});

const NO_STORE = { "Cache-Control": "no-store" } as const;

async function backendFavoriteSlugs(
  authToken: string
): Promise<string[] | null> {
  const page = await listFavoriteEventsExternal(authToken, 0, MAX_FAVORITES);
  if (!page) return null;
  return (page.content ?? [])
    .map((e) => e.slug)
    .filter((s): s is string => typeof s === "string" && s.length > 0);
}

export async function GET() {
  try {
    const authToken = await getAccessTokenFromCookies();

    if (authToken) {
      const favorites = await backendFavoriteSlugs(authToken);
      if (favorites === null) {
        // Don't pretend the list is empty when the backend is unreachable —
        // an authed user with real favorites would see them disappear.
        return NextResponse.json(
          { ok: false, error: "BACKEND_ERROR" },
          { status: 502, headers: NO_STORE }
        );
      }
      return NextResponse.json(
        { ok: true, favorites },
        { headers: NO_STORE }
      );
    }

    const favorites = await getFavoritesFromCookies();
    return NextResponse.json(
      { ok: true, favorites },
      { headers: NO_STORE }
    );
  } catch (error: unknown) {
    captureException(error, {
      tags: { feature: "favorites", route: "/api/favorites", method: "GET" },
    });
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500, headers: NO_STORE }
    );
  }
}

export async function POST(request: Request) {
  try {
    let json: unknown;
    try {
      json = await request.json();
    } catch (error: unknown) {
      captureException(error, {
        tags: {
          feature: "favorites",
          route: "/api/favorites",
          method: "POST",
          phase: "parse_json",
        },
      });
      return NextResponse.json(
        { ok: false, error: "INVALID_BODY" },
        { status: 400, headers: NO_STORE }
      );
    }

    const parsed = ToggleFavoriteSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "INVALID_BODY" },
        { status: 400, headers: NO_STORE }
      );
    }

    const { eventSlug, eventId, shouldBeFavorite } = parsed.data;
    const authToken = await getAccessTokenFromCookies();

    // Authenticated branch: backend is the source of truth.
    if (authToken) {
      if (!eventId) {
        // Falling back to the cookie path here would silently desync state:
        // the cookie write never reaches the backend and /preferits would
        // read an empty list for the user. Surface the bad request instead.
        return NextResponse.json(
          { ok: false, error: "EVENT_ID_REQUIRED" },
          { status: 400, headers: NO_STORE }
        );
      }
      const result = shouldBeFavorite
        ? await addFavoriteEventExternal(authToken, eventId)
        : await removeFavoriteEventExternal(authToken, eventId);

      if (!result.ok && result.status === 409) {
        return NextResponse.json(
          {
            ok: false,
            error: "MAX_FAVORITES_REACHED",
            maxFavorites: MAX_FAVORITES,
            analyticsEvent: "favorites_limit_reached",
            analyticsParams: {
              action: shouldBeFavorite ? "add" : "remove",
              max_favorites: MAX_FAVORITES,
            },
          },
          { status: 409, headers: NO_STORE }
        );
      }

      if (!result.ok) {
        return NextResponse.json(
          { ok: false, error: "BACKEND_ERROR" },
          { status: result.status || 502, headers: NO_STORE }
        );
      }

      // Don't re-fetch the full list here: the client optimistically
      // updated the toggled button, and SWR revalidates the shared list via
      // GET on its own cadence. Returning early saves a second backend
      // round-trip on every toggle (the GET handler is the canonical list).
      return NextResponse.json({ ok: true }, { headers: NO_STORE });
    }

    // Guest branch: cookie store, keyed by slug.
    const currentFavorites = await getFavoritesFromCookies();
    const nextSet = new Set(currentFavorites);

    if (shouldBeFavorite) {
      if (!nextSet.has(eventSlug) && nextSet.size >= MAX_FAVORITES) {
        return NextResponse.json(
          {
            ok: false,
            error: "MAX_FAVORITES_REACHED",
            maxFavorites: MAX_FAVORITES,
            analyticsEvent: "favorites_limit_reached",
            analyticsParams: {
              action: "add",
              max_favorites: MAX_FAVORITES,
            },
          },
          { status: 409, headers: NO_STORE }
        );
      }

      nextSet.delete(eventSlug);
      nextSet.add(eventSlug);
    } else {
      nextSet.delete(eventSlug);
    }

    const nextFavorites = Array.from(nextSet);
    const persistedFavorites = await persistFavoritesCookie(nextFavorites);

    return NextResponse.json(
      { ok: true, favorites: persistedFavorites },
      { headers: NO_STORE }
    );
  } catch (error: unknown) {
    captureException(error, {
      tags: { feature: "favorites", route: "/api/favorites", method: "POST" },
    });
    return NextResponse.json(
      { ok: false, error: "INTERNAL" },
      { status: 500, headers: NO_STORE }
    );
  }
}
